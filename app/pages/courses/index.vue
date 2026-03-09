<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'

interface CourseRow {
  id: string
  title: string
  slug: string | null
  cover_image: string | null
  category: string | null
  status: string
  author_id: string | null
  published_at: string | null
  created_at: string
  updated_at: string
  author: { id: string, full_name: string | null, username: string | null, avatar_url: string | null } | null
}

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')
const UAvatar = resolveComponent('UAvatar')
const UIcon = resolveComponent('UIcon')

useHead({ title: 'Courses – Jurutani Admin' })

const supabase = useSupabaseClient()
const toast = useToast()
const table = useTemplateRef('table')

// ─── Selection ────────────────────────────────────────────────────────────────
const rowSelection = ref<Record<string, boolean>>({})
const columnVisibility = ref<Record<string, boolean>>({})
const selectedCount = computed(() => Object.values(rowSelection.value).filter(Boolean).length)

function getSelectedRows(): CourseRow[] {
  return table.value?.tableApi
    ?.getFilteredSelectedRowModel()
    .rows.map((r: Row<CourseRow>) => r.original) ?? []
}

function clearSelection() { rowSelection.value = {} }

// ─── Filters ──────────────────────────────────────────────────────────────────
const search = useRouteQuery<string | undefined>('search', undefined, { resetKeys: ['page'] })
const filterStatus = useRouteQuery('status', [] as string[], { resetKeys: ['page'] })
const filterCategory = useRouteQuery('category', [] as string[], { resetKeys: ['page'] })
const sortValue = useRouteQuery('sort', 'created_at-desc', { resetKeys: ['page'] })
const page = useRouteQuery('page', 1)
const limit = useRouteQuery('limit', 15, { resetKeys: ['page'] })

// ─── Data ─────────────────────────────────────────────────────────────────────
const courses = ref<CourseRow[]>([])
const coursesCount = ref(0)
const pending = ref(false)

async function fetchCourses() {
  const [field, dir] = sortValue.value.split('-') as [string, string]
  let q = supabase
    .from('learning_courses')
    .select(
      'id, title, slug, cover_image, category, status, author_id, published_at, created_at, updated_at, author:profiles!learning_courses_author_id_fkey(id, full_name, username, avatar_url)',
      { count: 'exact' }
    )
    .is('deleted_at', null)
    .order(field, { ascending: dir === 'asc' })

  if (search.value) q = q.ilike('title', `%${search.value}%`)
  if (filterStatus.value?.length) q = q.in('status', filterStatus.value)
  if (filterCategory.value?.length) q = q.in('category', filterCategory.value)

  pending.value = true
  const { data, count, error } = await q.range((page.value - 1) * limit.value, page.value * limit.value - 1)
  pending.value = false

  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  courses.value = (data ?? []) as unknown as CourseRow[]
  coursesCount.value = count ?? 0
}

onMounted(fetchCourses)
watch([sortValue, page, limit], fetchCourses)
watchDebounced([search, filterStatus, filterCategory], async () => {
  page.value = 1
  await fetchCourses()
}, { debounce: 400, deep: true })

// ─── Status update ────────────────────────────────────────────────────────────
async function updateStatus(item: CourseRow, newStatus: string) {
  const updates: Record<string, any> = { status: newStatus }
  if (newStatus === 'approved' && !item.published_at) {
    updates.published_at = new Date().toISOString()
  }
  const { error } = await supabase.from('learning_courses').update(updates).eq('id', item.id)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  await fetchCourses()
  toast.add({ title: 'Status diperbarui', color: 'success', duration: 2000 })
}

async function bulkUpdateStatus(newStatus: string) {
  const selected = getSelectedRows()
  if (!selected.length) return
  const ids = selected.map(r => r.id)
  const updates: Record<string, any> = { status: newStatus }
  if (newStatus === 'approved') updates.published_at = new Date().toISOString()
  const { error } = await supabase.from('learning_courses').update(updates).in('id', ids)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  await fetchCourses()
  clearSelection()
  toast.add({ title: `${ids.length} course diperbarui`, color: 'success' })
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const deleteConfirmOpen = ref(false)
const deleteTargetRows = ref<CourseRow[]>([])
const deleteLoading = ref(false)

function openDeleteConfirm(rows: CourseRow[]) {
  deleteTargetRows.value = rows
  deleteConfirmOpen.value = true
}

async function confirmPermanentDelete() {
  const rows = deleteTargetRows.value
  if (!rows.length) return
  deleteLoading.value = true
  try {
    for (const row of rows) {
      if (row.cover_image) {
        await deleteCourseFile(row.cover_image).catch(() => null)
      }
    }
    const ids = rows.map(r => r.id)
    const { error } = await supabase.from('learning_courses').delete().in('id', ids)
    if (error) throw error
    toast.add({ title: `${ids.length} course dihapus permanen`, color: 'success' })
    deleteConfirmOpen.value = false
    deleteTargetRows.value = []
    clearSelection()
    await fetchCourses()
  } catch (err: any) {
    toast.add({ title: 'Gagal menghapus', description: err.message, color: 'error' })
  } finally {
    deleteLoading.value = false
  }
}

// ─── Row actions ──────────────────────────────────────────────────────────────
function rowActions(item: CourseRow) {
  return [
    [
      { label: 'Edit', icon: 'i-lucide-pencil', to: `/courses/${item.id}/edit` },
      { label: 'Kelola Lesson', icon: 'i-lucide-layers', to: `/courses/${item.id}/lessons` },
      { label: 'Detail / Preview', icon: 'i-lucide-eye', to: `/courses/${item.id}/preview` }
    ],
    [
      ...Enum.StatusLearning
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

// ─── Columns ─────────────────────────────────────────────────────────────────
const columns: TableColumn<CourseRow>[] = [
  {
    id: 'select',
    enableHiding: false,
    header: ({ table: t }) =>
      h(UCheckbox, {
        id: 'courses-select-all',
        modelValue: t.getIsSomePageRowsSelected() ? 'indeterminate' : t.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => t.toggleAllPageRowsSelected(!!v),
        ariaLabel: 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        id: `courses-select-${row.id}`,
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
        ariaLabel: 'Select row'
      })
  },
  {
    id: 'cover',
    header: '',
    enableHiding: false,
    cell: ({ row }) =>
      h('div', { class: 'size-10 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0' },
        row.original.cover_image
          ? h('img', { src: getCoursePublicUrl(row.original.cover_image) ?? row.original.cover_image, class: 'size-full object-cover' })
          : h(UIcon, { name: 'i-lucide-book-open', class: 'size-5 text-muted' })
      )
  },
  {
    accessorKey: 'title',
    header: 'Judul',
    cell: ({ row }) =>
      h('div', { class: 'min-w-0' }, [
        h('p', { class: 'font-medium text-highlighted truncate max-w-xs' }, row.original.title),
        row.original.slug
          ? h('p', { class: 'text-xs text-muted truncate max-w-xs' }, `/courses/${row.original.slug}`)
          : null
      ])
  },
  {
    accessorKey: 'category',
    header: 'Kategori',
    cell: ({ row }) => {
      const cat = Enum.CourseCategories.find(c => c.value === row.original.category)
      if (!cat) return h('span', { class: 'text-muted text-sm' }, '-')
      return h('div', { class: 'flex items-center gap-1.5' }, [
        h(UIcon, { name: cat.icon, class: 'size-3.5 text-muted shrink-0' }),
        h('span', { class: 'text-sm truncate' }, cat.label)
      ])
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = Enum.StatusLearning.find(x => x.value === row.original.status)
      const colorMap: Record<string, any> = { neutral: 'neutral', success: 'success', warning: 'warning', error: 'error' }
      return h(
        UDropdownMenu,
        {
          items: Enum.StatusLearning.map(opt => ({
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
    id: 'author',
    header: 'Author',
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

const columnLabels: Record<string, string> = {
  cover: 'Cover',
  title: 'Judul',
  category: 'Kategori',
  status: 'Status',
  author: 'Author',
  created_at: 'Dibuat'
}

const statusOptions = Enum.StatusLearning.map(s => ({ label: s.label, value: s.value }))
const categoryOptions = Enum.CourseCategories.map(c => ({ label: c.label, value: c.value }))
const bulkStatusOptions = Enum.StatusLearning.map(s => ({
  label: `Ubah ke ${s.label}`,
  onSelect: () => bulkUpdateStatus(s.value)
}))
</script>

<template>
  <UDashboardPanel id="courses">
    <template #header>
      <UDashboardNavbar title="Courses" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton
            to="/courses/create"
            icon="i-lucide-plus"
            label="Buat Course"
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
          placeholder="Cari judul course..."
          class="min-w-52"
        />
        <USelectMenu
          v-model="filterStatus"
          :items="statusOptions"
          placeholder="Status"
          multiple
          value-key="value"
          class="min-w-36"
        />
        <USelectMenu
          v-model="filterCategory"
          :items="categoryOptions"
          placeholder="Kategori"
          multiple
          value-key="value"
          class="min-w-40"
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
            @click="fetchCourses()"
          />
        </div>
      </div>

      <UTable
        ref="table"
        v-model:row-selection="rowSelection"
        v-model:column-visibility="columnVisibility"
        :data="courses"
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
        :total="coursesCount"
        label="course"
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
      <span class="text-sm font-medium text-highlighted">{{ selectedCount }} dipilih</span>
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
        @click="clearSelection()"
      />
    </div>
  </Transition>

  <!-- Delete confirm modal -->
  <UModal v-model:open="deleteConfirmOpen" title="Hapus Course Permanen">
    <template #body>
      <p class="text-sm text-muted">
        Kamu akan menghapus <span class="font-semibold text-highlighted">{{ deleteTargetRows.length }} course</span> secara permanen.
        Semua lesson, progress, komentar, rating, dan file terkait akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="outline" label="Batal" @click="deleteConfirmOpen = false" />
        <UButton color="error" label="Hapus Permanen" :loading="deleteLoading" @click="confirmPermanentDelete" />
      </div>
    </template>
  </UModal>
</template>
