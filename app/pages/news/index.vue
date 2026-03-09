<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { Database } from '~/types/database.types'

type NewsRow = Database['public']['Tables']['news_updated']['Row'] & {
  author?: { id: string, full_name: string | null, username: string | null, avatar_url: string | null } | null
}
type Category = Database['public']['Tables']['category_news']['Row']

// Resolve components for h() usage
const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')
const UAvatar = resolveComponent('UAvatar')

useHead({ title: 'News – Jurutani Admin' })

const supabase = useSupabaseClient()
const toast = useToast()
const table = useTemplateRef('table')

// ─── State ───────────────────────────────────────────────────────────────────
const rowSelection = ref<Record<string, boolean>>({})
const columnVisibility = ref<Record<string, boolean>>({
  cover: false,
  author: false
})

// URL-persisted filter/sort/page/limit state
const search = useRouteQuery<string | undefined>('search', undefined, { resetKeys: ['page'] })
const filterCategory = useRouteQuery('category', [] as string[], { resetKeys: ['page'] })
const filterStatus = useRouteQuery('status', [] as string[], { resetKeys: ['page'] })
const sortValue = useRouteQuery('sort', 'created_at-desc', { resetKeys: ['page'] })
const page = useRouteQuery('page', 1)
const limit = useRouteQuery('limit', 15, { resetKeys: ['page'] })

// ─── Derived ─────────────────────────────────────────────────────────────────
const selectedCount = computed(() => Object.values(rowSelection.value).filter(Boolean).length)

function getSelectedRows(): NewsRow[] {
  return table.value?.tableApi
    ?.getFilteredSelectedRowModel()
    .rows.map((r: Row<NewsRow>) => r.original) ?? []
}

function clearSelection() {
  rowSelection.value = {}
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const { data: categories } = await useAsyncData('news-categories', async () => {
  const { data } = await supabase
    .from('category_news')
    .select('*')
    .is('deleted_at', null)
    .order('name')
  return (data ?? []) as Category[]
}, { default: () => [] as Category[] })

// Select reaktif — JOIN author hanya saat kolom author ditampilkan
const selectString = computed(() => {
  const base = 'id, title, sub_title, category, status_news, created_at, slug, cover_image, images, published_at'
  const authorJoin = columnVisibility.value.author !== false
    ? ', author:profiles(id, full_name, username, avatar_url)'
    : ''
  return `${base}${authorJoin}`
})

const newsQuery = computed(() => {
  const [field, dir] = sortValue.value.split('-') as [string, string]
  const dbField = field === 'name' ? 'title' : field
  let q = supabase
    .from('news_updated')
    .select(selectString.value, { count: 'exact' })
    .is('deleted_at', null)
    .order(dbField, { ascending: dir === 'asc' })

  if (search.value) q = q.ilike('title', `%${search.value}%`)
  if (filterCategory.value?.length) q = q.in('category', filterCategory.value)
  if (filterStatus.value?.length) q = q.in('status_news', filterStatus.value)

  return q
})

const { data: newsData, refresh, pending } = await useAsyncData('news-list', async () => {
  const { data, count, error } = await newsQuery.value
    .range((page.value - 1) * limit.value, page.value * limit.value - 1)
  if (error) throw error
  return { data: (data ?? []) as NewsRow[], count: count ?? 0 }
}, {
  default: () => ({ data: [] as NewsRow[], count: 0 }),
  watch: [sortValue, page, limit]
})

watchDebounced([search, filterCategory, filterStatus], async () => {
  page.value = 1
  await refresh()
}, { debounce: 400, deep: true })

// Refresh saat kolom author di-toggle (karena SELECT berubah)
watch(() => columnVisibility.value.author, async () => {
  await refresh()
})

// ─── Status actions ──────────────────────────────────────────────────────────
async function updateStatus(item: NewsRow, newStatus: string) {
  const updates: Record<string, any> = { status_news: newStatus }
  if (newStatus === 'approved' && !item.published_at) {
    updates.published_at = new Date().toISOString()
  }
  const { error } = await supabase.from('news_updated').update(updates).eq('id', item.id)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }

  await refresh()
  toast.add({ title: 'Status diperbarui', color: 'success', duration: 2000 })
}

async function bulkUpdateStatus(newStatus: string) {
  const selected = getSelectedRows()
  if (!selected.length) return
  const ids = selected.map(r => r.id)
  const updates: Record<string, any> = { status_news: newStatus }
  if (newStatus === 'approved') updates.published_at = new Date().toISOString()

  const { error } = await supabase.from('news_updated').update(updates).in('id', ids)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }

  await refresh()
  clearSelection()
  toast.add({ title: `${ids.length} berita diperbarui`, color: 'success' })
}

// ─── Permanent delete ─────────────────────────────────────────────────────────
const deleteConfirmOpen = ref(false)
const deleteTargetRows = ref<NewsRow[]>([])
const deleteLoading = ref(false)

function openDeleteConfirm(rows: NewsRow[]) {
  deleteTargetRows.value = rows
  deleteConfirmOpen.value = true
}

async function confirmPermanentDelete() {
  const rows = deleteTargetRows.value
  if (!rows.length) return
  deleteLoading.value = true
  try {
    // Delete storage files for each row
    for (const row of rows) {
      const paths: string[] = []
      if (row.cover_image) paths.push(row.cover_image)
      if (row.images) {
        for (const p of (row.images as string[])) if (p) paths.push(p)
      }
      await Promise.allSettled(paths.map(p => deleteNewsFile(p)))
    }
    // Delete DB records
    const ids = rows.map(r => r.id)
    const { error } = await supabase.from('news_updated').delete().in('id', ids)
    if (error) throw error
    toast.add({ title: `${ids.length} berita dihapus permanen`, color: 'success' })
    deleteConfirmOpen.value = false
    deleteTargetRows.value = []
    clearSelection()
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Gagal menghapus', description: err.message, color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

// ─── Copy helpers ─────────────────────────────────────────────────────────────
async function handleCopy(text: string, label: string) {
  await copyText(text)
  toast.add({ title: `${label} disalin`, description: text, color: 'success', duration: 2000 })
}

// ─── Export ──────────────────────────────────────────────────────────────────
function buildExportColumns(): ExportColumn[] {
  return [
    { key: 'title', header: 'Judul' },
    { key: 'sub_title', header: 'Sub Judul' },
    { key: 'categoryLabel', header: 'Kategori' },
    { key: 'statusLabel', header: 'Status' },
    { key: 'slug', header: 'Slug' },
    { key: 'publishedFmt', header: 'Dipublikasikan' },
    { key: 'createdFmt', header: 'Dibuat' }
  ]
}

function buildExportRows() {
  const rows = getSelectedRows().length > 0 ? getSelectedRows() : (newsData.value?.data ?? [])
  return rows.map(n => ({
    ...n,
    categoryLabel: (categories.value ?? []).find(c => c.value === n.category)?.name ?? n.category,
    statusLabel: Enum.StatusNews.find(s => s.value === n.status_news)?.label ?? n.status_news,
    publishedFmt: n.published_at ? format(new Date(n.published_at), 'dd MMM yyyy', { locale: localeId }) : '-',
    createdFmt: format(new Date(n.created_at), 'dd MMM yyyy', { locale: localeId })
  }))
}

async function handleExportPdf() {
  await exportToPdf(buildExportRows(), buildExportColumns(), `jurutani-news-${Date.now()}`, 'Daftar Berita')
}

async function handleExportExcel() {
  await exportToExcel(buildExportRows(), buildExportColumns(), `jurutani-news-${Date.now()}`, 'Berita')
}

// ─── Row actions ──────────────────────────────────────────────────────────────
function rowActions(item: NewsRow) {
  return [
    [
      { label: 'Edit', icon: 'i-lucide-pencil', to: `/news/${item.id}/edit` },
      {
        label: 'Preview',
        icon: 'i-lucide-eye',
        disabled: !item.slug,
        to: item.slug ? `/news/preview/${item.slug}` : undefined
      }
    ],
    [
      { label: 'Salin ID', icon: 'i-lucide-copy', onSelect: () => handleCopy(item.id, 'ID') },
      { label: 'Salin Slug', icon: 'i-lucide-link-2', disabled: !item.slug, onSelect: () => item.slug && handleCopy(item.slug, 'Slug') }
    ],
    [
      ...Enum.StatusNews
        .filter(s => s.value !== item.status_news)
        .map(s => ({
          label: `Ubah ke ${s.label}`,
          icon: 'i-lucide-tag',
          onSelect: () => updateStatus(item, s.value)
        }))
    ],
    [
      {
        label: 'Hapus Permanen',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => openDeleteConfirm([item])
      }
    ]
  ]
}

// ─── Table columns ────────────────────────────────────────────────────────────
const columns: TableColumn<NewsRow>[] = [
  {
    id: 'select',
    enableHiding: false,
    header: ({ table: t }) =>
      h(UCheckbox, {
        'id': 'news-select-all',
        'modelValue': t.getIsSomePageRowsSelected() ? 'indeterminate' : t.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => t.toggleAllPageRowsSelected(!!v),
        'ariaLabel': 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'id': `news-select-${row.id}`,
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
        'ariaLabel': 'Select row'
      })
  },
  {
    id: 'cover',
    header: '',
    cell: ({ row }) =>
      h('div', { class: 'size-10 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0' },
        row.original.cover_image
          ? h('img', { src: getNewsPublicUrl(row.original.cover_image) ?? row.original.cover_image, class: 'size-full object-cover' })
          : h('span', { class: 'i-lucide-image text-muted w-5 h-5' })
      )
  },
  {
    accessorKey: 'title',
    header: 'Judul',
    cell: ({ row }) =>
      h('div', { class: 'min-w-0' }, [
        h('p', { class: 'font-medium text-highlighted truncate max-w-xs' }, row.original.title),
        row.original.sub_title
          ? h('p', { class: 'text-xs text-muted truncate max-w-xs' }, row.original.sub_title)
          : null
      ])
  },
  {
    accessorKey: 'category',
    header: 'Kategori',
    cell: ({ row }) => {
      const cat = categories.value.find(c => c.value === row.original.category)
      return h(UBadge, { variant: 'soft', color: 'primary', class: 'capitalize' }, () => cat?.name ?? row.original.category)
    }
  },
  {
    accessorKey: 'status_news',
    header: 'Status',
    cell: ({ row }) => {
      const s = Enum.StatusNews.find(x => x.value === row.original.status_news)
      const colorMap: Record<string, any> = { neutral: 'neutral', success: 'success', warning: 'warning', error: 'error' }
      return h(
        UDropdownMenu,
        {
          items: Enum.StatusNews.map(opt => ({
            label: opt.label,
            onSelect: () => updateStatus(row.original, opt.value)
          })),
          content: { align: 'start' }
        },
        () => h(UBadge, {
          variant: 'subtle',
          color: colorMap[s?.color ?? 'neutral'],
          class: 'cursor-pointer capitalize gap-1',
          trailingIcon: 'i-lucide-chevron-down'
        }, () => s?.label ?? row.original.status_news)
      )
    }
  },
  {
    id: 'author',
    header: 'Penulis',
    cell: ({ row }) => {
      const au = row.original.author
      if (!au) return h('span', { class: 'text-muted text-sm' }, '-')
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UAvatar, { src: au.avatar_url ?? undefined, alt: au.full_name ?? 'User', size: 'xs' }),
        h('span', { class: 'text-sm truncate max-w-24' }, au.full_name ?? au.username ?? '-')
      ])
    }
  },
  {
    accessorKey: 'created_at',
    header: 'Dibuat',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted whitespace-nowrap' },
        format(new Date(row.original.created_at), 'dd MMM yyyy', { locale: localeId }))
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) =>
      h('div', { class: 'text-right' },
        h(UDropdownMenu, {
          items: rowActions(row.original),
          content: { align: 'end' }
        }, () => h(UButton, { icon: 'i-lucide-ellipsis-vertical', color: 'neutral', variant: 'ghost', class: 'ml-auto' }))
      )
  }
]

// ─── Selects & labels ─────────────────────────────────────────────────────────
const columnLabels: Record<string, string> = {
  cover: 'Cover',
  title: 'Judul',
  category: 'Kategori',
  status_news: 'Status',
  author: 'Penulis',
  created_at: 'Dibuat'
}

const categoryOptions = computed(() =>
  (categories.value ?? []).map(c => ({ label: c.name, value: c.value }))
)

const statusOptions = Enum.StatusNews.map(s => ({ label: s.label, value: s.value }))

const bulkStatusOptions = Enum.StatusNews.map(s => ({
  label: `Ubah ke ${s.label}`,
  onSelect: () => bulkUpdateStatus(s.value)
}))
</script>

<template>
  <UDashboardPanel id="news">
    <template #header>
      <UDashboardNavbar title="News" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-file-spreadsheet"
            label="Excel"
            @click="handleExportExcel"
          />
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-file-text"
            label="PDF"
            @click="handleExportPdf"
          />
          <UButton
            to="/news/create"
            icon="i-lucide-plus"
            label="Buat Berita"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Cari judul berita..."
          class="min-w-52"
        />
        <USelectMenu
          v-model="filterCategory"
          :items="categoryOptions"
          placeholder="Kategori"
          multiple
          value-key="value"
          class="min-w-40"
        />
        <USelectMenu
          v-model="filterStatus"
          :items="statusOptions"
          placeholder="Status"
          multiple
          value-key="value"
          class="min-w-36"
        />
        <USelect
          v-model="sortValue"
          :items="Enum.SortOptions"
          value-key="value"
          label-key="label"
          class="min-w-36"
        />
        <div class="ml-auto flex items-center gap-2">
          <!-- Column visibility dropdown -->
          <UDropdownMenu
            :items="table?.tableApi?.getAllColumns()
              .filter((col: any) => col.getCanHide())
              .map((col: any) => ({
                label: columnLabels[col.id] ?? col.id,
                type: 'checkbox' as const,
                checked: col.getIsVisible(),
                onUpdateChecked(checked: boolean) {
                  table?.tableApi?.getColumn(col.id)?.toggleVisibility(!!checked)
                },
                onSelect(e: Event) { e.preventDefault() }
              }))"
            :content="{ align: 'end' }"
          >
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-columns-3"
              trailing-icon="i-lucide-chevron-down"
              label="Kolom"
            />
          </UDropdownMenu>
          <!-- Refresh button -->
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            :loading="pending"
            @click="refresh()"
          />
        </div>
      </div>

      <!-- Table -->
      <UTable
        ref="table"
        v-model:row-selection="rowSelection"
        v-model:column-visibility="columnVisibility"
        :data="newsData?.data ?? []"
        :columns="columns"
        :loading="pending"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default'
        }"
      />
    </template>

    <template #footer>
      <Pagination
        v-model:page="page"
        v-model:limit="limit"
        :total="newsData?.count ?? 0"
        :query="newsQuery"
        label="berita"
      />
    </template>
  </UDashboardPanel>

  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="translate-y-4 opacity-0"
    leave-active-class="transition ease-in duration-150"
    leave-to-class="translate-y-4 opacity-0"
  >
    <div
      v-if="selectedCount > 0"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-xl bg-elevated border border-default backdrop-blur"
    >
      <span class="text-sm font-medium text-highlighted">
        {{ selectedCount }} dipilih
      </span>
      <USeparator orientation="vertical" class="h-5" />
      <UDropdownMenu :items="[bulkStatusOptions]">
        <UButton
          color="neutral"
          variant="soft"
          label="Ubah Status"
          trailing-icon="i-lucide-chevron-up"
          size="sm"
        />
      </UDropdownMenu>
      <UButton
        color="neutral"
        variant="soft"
        icon="i-lucide-file-text"
        label="PDF"
        size="sm"
        @click="handleExportPdf"
      />
      <UButton
        color="neutral"
        variant="soft"
        icon="i-lucide-file-spreadsheet"
        label="Excel"
        size="sm"
        @click="handleExportExcel"
      />
      <USeparator orientation="vertical" class="h-5" />
      <UButton
        color="error"
        variant="soft"
        icon="i-lucide-trash-2"
        label="Hapus"
        size="sm"
        @click="openDeleteConfirm(getSelectedRows())"
      />
      <USeparator orientation="vertical" class="h-5" />
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        size="sm"
        @click="clearSelection"
      />
    </div>
  </Transition>

  <!-- Confirm permanent delete modal -->
  <UModal
    v-model:open="deleteConfirmOpen"
    :title="`Hapus ${deleteTargetRows.length} Berita Secara Permanen?`"
    description="Tindakan ini tidak dapat dibatalkan. Semua file dan data akan dihapus dari sistem."
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <ul v-if="deleteTargetRows.length <= 5" class="space-y-1 mb-4">
        <li
          v-for="row in deleteTargetRows"
          :key="row.id"
          class="text-sm text-highlighted flex items-center gap-2"
        >
          <UIcon name="i-lucide-newspaper" class="size-4 text-muted shrink-0" />
          {{ row.title }}
        </li>
      </ul>
      <p v-else class="text-sm text-muted mb-4">
        {{ deleteTargetRows.length }} berita akan dihapus beserta semua file terkait.
      </p>
      <div class="flex justify-end gap-2">
        <UButton
          label="Batal"
          color="neutral"
          variant="subtle"
          :disabled="deleteLoading"
          @click="deleteConfirmOpen = false"
        />
        <UButton
          label="Hapus Permanen"
          color="error"
          icon="i-lucide-trash-2"
          :loading="deleteLoading"
          @click="confirmPermanentDelete"
        />
      </div>
    </template>
  </UModal>
</template>
