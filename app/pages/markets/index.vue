<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { Database } from '~/types/database.types'

type MarketRow = Database['public']['Tables']['product_markets']['Row'] & {
  owner?: { id: string, full_name: string | null, username: string | null, avatar_url: string | null } | null
}
type CategoryMarket = Database['public']['Tables']['category_markets']['Row']

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')
const UAvatar = resolveComponent('UAvatar')

useHead({ title: 'Markets – Jurutani Admin' })

const supabase = useSupabase()
const toast = useToast()
const table = useTemplateRef('table')

// ─── State ────────────────────────────────────────────────────────────────────
const rowSelection = ref<Record<string, boolean>>({})
const columnVisibility = ref<Record<string, boolean>>({})

// URL-persisted filter/sort/page/limit state
const search = useRouteQuery<string | undefined>('search', undefined, { resetKeys: ['page'] })
const filterCategory = useRouteQuery('category', [] as string[], { resetKeys: ['page'] })
const filterStatus = useRouteQuery('status', [] as string[], { resetKeys: ['page'] })
const sortValue = useRouteQuery('sort', 'created_at-desc', { resetKeys: ['page'] })
const page = useRouteQuery('page', 1)
const limit = useRouteQuery('limit', 15, { resetKeys: ['page'] })

// ─── Derived ──────────────────────────────────────────────────────────────────
const selectedCount = computed(() => Object.values(rowSelection.value).filter(Boolean).length)

function getSelectedRows(): MarketRow[] {
  return table.value?.tableApi
    ?.getFilteredSelectedRowModel()
    .rows.map((r: Row<MarketRow>) => r.original) ?? []
}

function clearSelection() {
  rowSelection.value = {}
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const { data: categories } = await useAsyncData('market-categories', async () => {
  const { data } = await supabase
    .from('category_markets')
    .select('*')
    .is('deleted_at', null)
    .order('name')
  return (data ?? []) as CategoryMarket[]
}, { default: () => [] as CategoryMarket[] })

const marketQuery = computed(() => {
  const [field, dir] = sortValue.value.split('-') as [string, string]
  const dbField = field === 'name' ? 'name' : field
  let q = supabase
    .from('product_markets')
    .select('*, owner:profiles(id, full_name, username, avatar_url)', { count: 'exact' })
    .is('deleted_at', null)
    // rejected & deleted always last (DB-level, cross-page)
    .order('status_depriority' as any, { ascending: true })
    .order(dbField, { ascending: dir === 'asc' })

  if (search.value) q = q.ilike('name', `%${search.value}%`)
  if (filterCategory.value?.length) q = q.in('category', filterCategory.value)
  if (filterStatus.value?.length) q = q.in('status', filterStatus.value)
  return q
})

const { data: marketData, refresh, pending } = await useAsyncData('market-list', async () => {
  const { data, count, error } = await marketQuery.value
    .range((page.value - 1) * limit.value, page.value * limit.value - 1)
  if (error) throw error
  return { data: (data ?? []) as MarketRow[], count: count ?? 0 }
}, {
  default: () => ({ data: [] as MarketRow[], count: 0 }),
  watch: [sortValue, page, limit]
})

watchDebounced([search, filterCategory, filterStatus], async () => {
  page.value = 1
  await refresh()
}, { debounce: 400, deep: true })

// ─── Status actions ───────────────────────────────────────────────────────────
async function updateStatus(item: MarketRow, newStatus: string) {
  const updates: Record<string, any> = { status: newStatus }
  if (newStatus === 'approved' && !item.published_at) {
    updates.published_at = new Date().toISOString()
  }
  const { error } = await supabase.from('product_markets').update(updates).eq('id', item.id)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  await refresh()
  toast.add({ title: 'Status diperbarui', color: 'success', duration: 2000 })
}

async function bulkUpdateStatus(newStatus: string) {
  const selected = getSelectedRows()
  if (!selected.length) return
  const ids = selected.map(r => r.id)
  const updates: Record<string, any> = { status: newStatus }
  if (newStatus === 'approved') updates.published_at = new Date().toISOString()
  const { error } = await supabase.from('product_markets').update(updates).in('id', ids)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  await refresh()
  clearSelection()
  toast.add({ title: `${ids.length} produk diperbarui`, color: 'success' })
}

// ─── Permanent delete ─────────────────────────────────────────────────────────
const deleteConfirmOpen = ref(false)
const deleteTargetRows = ref<MarketRow[]>([])
const deleteLoading = ref(false)

type AttachmentItem = { url: string, name: string, type: string, size: number }

function openDeleteConfirm(rows: MarketRow[]) {
  deleteTargetRows.value = rows
  deleteConfirmOpen.value = true
}

async function confirmPermanentDelete() {
  const rows = deleteTargetRows.value
  if (!rows.length) return
  deleteLoading.value = true
  try {
    for (const row of rows) {
      const paths: string[] = []
      if (row.thumbnail_url) paths.push(row.thumbnail_url)
      if (row.images) {
        for (const p of (row.images as unknown as string[])) if (p) paths.push(p)
      }
      if (row.attachments) {
        for (const att of (row.attachments as unknown as AttachmentItem[])) if (att?.url) paths.push(att.url)
      }
      await Promise.allSettled(paths.map(p => deleteMarketFile(p)))
    }
    const ids = rows.map(r => r.id)
    const { error } = await supabase.from('product_markets').delete().in('id', ids)
    if (error) throw error
    toast.add({ title: `${ids.length} produk dihapus permanen`, color: 'success' })
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

// ─── Export ───────────────────────────────────────────────────────────────────
function buildExportColumns(): ExportColumn[] {
  return [
    { key: 'name', header: 'Nama Produk' },
    { key: 'excerpt', header: 'Ringkasan' },
    { key: 'categoryLabel', header: 'Kategori' },
    { key: 'seller', header: 'Penjual' },
    { key: 'contact_seller', header: 'Kontak' },
    { key: 'priceLabel', header: 'Harga' },
    { key: 'statusLabel', header: 'Status' },
    { key: 'slug', header: 'Slug' },
    { key: 'publishedFmt', header: 'Dipublikasikan' },
    { key: 'createdFmt', header: 'Dibuat' }
  ]
}

function buildExportRows() {
  const rows = getSelectedRows().length > 0 ? getSelectedRows() : (marketData.value?.data ?? [])
  return rows.map(m => ({
    ...m,
    categoryLabel: (categories.value ?? []).find(c => c.value === m.category)?.name ?? m.category,
    statusLabel: Enum.StatusMarkets.find(s => s.value === m.status)?.label ?? m.status,
    priceLabel: m.price != null
      ? `Rp ${Number(m.price).toLocaleString('id-ID')}${m.price_unit ? `/${m.price_unit}` : ''}`
      : m.price_range ?? '-',
    publishedFmt: m.published_at ? format(new Date(m.published_at), 'dd MMM yyyy', { locale: localeId }) : '-',
    createdFmt: format(new Date(m.created_at), 'dd MMM yyyy', { locale: localeId })
  }))
}

async function handleExportPdf() {
  await exportToPdf(buildExportRows(), buildExportColumns(), `jurutani-markets-${Date.now()}`, 'Daftar Produk Market')
}

async function handleExportExcel() {
  await exportToExcel(buildExportRows(), buildExportColumns(), `jurutani-markets-${Date.now()}`, 'Markets')
}

// ─── Row actions ──────────────────────────────────────────────────────────────
function rowActions(item: MarketRow) {
  return [
    [
      { label: 'Edit', icon: 'i-lucide-pencil', to: `/markets/${item.id}/edit` },
      {
        label: 'Preview',
        icon: 'i-lucide-eye',
        disabled: !item.slug,
        to: item.slug ? `/markets/preview/${item.slug}` : undefined
      }
    ],
    [
      { label: 'Salin ID', icon: 'i-lucide-copy', onSelect: () => handleCopy(item.id, 'ID') },
      {
        label: 'Salin Slug',
        icon: 'i-lucide-link-2',
        disabled: !item.slug,
        onSelect: () => item.slug && handleCopy(item.slug, 'Slug')
      }
    ],
    [
      ...Enum.StatusMarkets
        .filter(s => s.value !== item.status)
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
const columns: TableColumn<MarketRow>[] = [
  {
    id: 'select',
    enableHiding: false,
    header: ({ table: t }) =>
      h(UCheckbox, {
        id: 'market-select-all',
        modelValue: t.getIsSomePageRowsSelected() ? 'indeterminate' : t.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => t.toggleAllPageRowsSelected(!!v),
        ariaLabel: 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        id: `market-select-${row.id}`,
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
        ariaLabel: 'Select row'
      })
  },
  {
    id: 'thumbnail',
    header: '',
    cell: ({ row }) =>
      h('div', { class: 'size-10 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0' },
        row.original.thumbnail_url
          ? h('img', { src: getMarketPublicUrl(row.original.thumbnail_url) ?? row.original.thumbnail_url, class: 'size-full object-cover' })
          : h('span', { class: 'i-lucide-shopping-bag text-muted w-5 h-5' })
      )
  },
  {
    accessorKey: 'name',
    header: 'Nama Produk',
    cell: ({ row }) =>
      h('div', { class: 'min-w-0' }, [
        h('p', { class: 'font-medium text-highlighted truncate max-w-xs' }, row.original.name),
        row.original.excerpt
          ? h('p', { class: 'text-xs text-muted truncate max-w-xs' }, row.original.excerpt)
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
    id: 'price',
    header: 'Harga',
    cell: ({ row }) => {
      const m = row.original
      if (m.price != null) {
        return h('div', { class: 'text-sm' }, [
          h('span', { class: 'font-medium text-highlighted' }, `Rp ${Number(m.price).toLocaleString('id-ID')}`),
          m.price_unit ? h('span', { class: 'text-muted' }, `/${m.price_unit}`) : null
        ])
      }
      if (m.price_range) {
        return h('span', { class: 'text-sm text-muted' }, m.price_range)
      }
      return h('span', { class: 'text-sm text-muted' }, '-')
    }
  },
  {
    accessorKey: 'seller',
    header: 'Penjual',
    cell: ({ row }) =>
      h('div', { class: 'min-w-0' }, [
        h('p', { class: 'text-sm truncate max-w-32' }, row.original.seller),
        row.original.contact_seller
          ? h('p', { class: 'text-xs text-muted truncate' }, row.original.contact_seller)
          : null
      ])
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = Enum.StatusMarkets.find(x => x.value === row.original.status)
      const colorMap: Record<string, any> = { neutral: 'neutral', success: 'success', warning: 'warning', error: 'error' }
      return h(
        UDropdownMenu,
        {
          items: Enum.StatusMarkets.map(opt => ({
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
        }, () => s?.label ?? row.original.status)
      )
    }
  },
  {
    id: 'owner',
    header: 'Pemilik',
    cell: ({ row }) => {
      const ow = row.original.owner
      if (!ow) return h('span', { class: 'text-muted text-sm' }, '-')
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UAvatar, { src: ow.avatar_url ?? undefined, alt: ow.full_name ?? 'User', size: 'xs' }),
        h('span', { class: 'text-sm truncate max-w-24' }, ow.full_name ?? ow.username ?? '-')
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
  thumbnail: 'Foto',
  name: 'Nama Produk',
  category: 'Kategori',
  price: 'Harga',
  seller: 'Penjual',
  status: 'Status',
  owner: 'Pemilik',
  created_at: 'Dibuat'
}

const categoryOptions = computed(() =>
  (categories.value ?? []).map(c => ({ label: c.name, value: c.value }))
)

const statusOptions = Enum.StatusMarkets.map(s => ({ label: s.label, value: s.value }))

const bulkStatusOptions = Enum.StatusMarkets.map(s => ({
  label: `Ubah ke ${s.label}`,
  onSelect: () => bulkUpdateStatus(s.value)
}))
</script>

<template>
  <UDashboardPanel id="markets">
    <template #header>
      <UDashboardNavbar title="Markets" :ui="{ right: 'gap-2' }">
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
            to="/markets/create"
            icon="i-lucide-plus"
            label="Tambah Produk"
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
          placeholder="Cari produk..."
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
        :data="marketData?.data ?? []"
        :columns="columns"
        :loading="pending"
        :ui="{
          base: 'table-fixed border-separate border-spacing-0',
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
          td: 'border-b border-default',
        }"
      />
    </template>

    <template #footer>
      <Pagination
        v-model:page="page"
        v-model:limit="limit"
        :total="marketData?.count ?? 0"
        :query="marketQuery"
        label="produk"
      />
    </template>
  </UDashboardPanel>

  <!-- Bulk action bar -->
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
    :title="`Hapus ${deleteTargetRows.length} Produk Secara Permanen?`"
    description="Tindakan ini tidak dapat dibatalkan. Semua file dan data akan dihapus dari sistem."
  >
    <template #body>
      <ul v-if="deleteTargetRows.length <= 5" class="space-y-1 mb-4">
        <li
          v-for="row in deleteTargetRows"
          :key="row.id"
          class="text-sm text-highlighted flex items-center gap-2"
        >
          <UIcon name="i-lucide-shopping-basket" class="size-4 text-muted shrink-0" />
          {{ row.name }}
        </li>
      </ul>
      <p v-else class="text-sm text-muted mb-4">
        {{ deleteTargetRows.length }} produk akan dihapus beserta semua file terkait.
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
