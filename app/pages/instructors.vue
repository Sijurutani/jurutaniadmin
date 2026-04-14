<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { Database } from '~/types/database.types'

type InstructorRow = Database['public']['Tables']['instructors']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type InstructorWithProfile = InstructorRow & {
  profile: Partial<ProfileRow> | null
}

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')
const UAvatar = resolveComponent('UAvatar')

useHead({ title: 'Instructors – Jurutani Admin' })

const supabase = useSupabaseClient()
const toast = useToast()
const table = useTemplateRef('table')

// ─── Selection ────────────────────────────────────────────────────────────────
const rowSelection = ref<Record<string, boolean>>({})
const columnVisibility = ref<Record<string, boolean>>({
  user: true // selalu tampil
})
const selectedCount = computed(() => Object.values(rowSelection.value).filter(Boolean).length)

function getSelectedRows(): InstructorWithProfile[] {
  return table.value?.tableApi
    ?.getFilteredSelectedRowModel()
    .rows.map((r: Row<InstructorWithProfile>) => r.original) ?? []
}

function clearSelection() { rowSelection.value = {} }

// ─── Filters ──────────────────────────────────────────────────────────────────
const search = useRouteQuery<string | undefined>('search', undefined, { resetKeys: ['page'] })
const filterProvince = useRouteQuery<string | undefined>('province', undefined, { resetKeys: ['page'] })
const filterDistrict = useRouteQuery<string | undefined>('district', undefined, { resetKeys: ['page'] })
const filterDeleted = useRouteQuery<string>('deleted', 'false', { resetKeys: ['page'] })
const sortValue = useRouteQuery('sort', 'created_at-desc', { resetKeys: ['page'] })
const page = useRouteQuery('page', 1)
const limit = useRouteQuery('limit', 15, { resetKeys: ['page'] })

// ─── Districts (from table) ───────────────────────────────────────────────────
type DistrictRow = { id: number, name: string, province: string }
const { data: allDistricts } = await useAsyncData('all-districts', async () => {
  const { data } = await supabase
    .from('districts')
    .select('id, name, province')
    .order('province')
    .order('name')
  return (data ?? []) as DistrictRow[]
}, { default: () => [] as DistrictRow[] })

// Reset district filter when province changes
watch(filterProvince, () => { filterDistrict.value = undefined })

// ─── Data ─────────────────────────────────────────────────────────────────────
const resolvedUserIds = ref<string[] | null>(null)
const { data: instructorData, refresh, pending } = await useAsyncData('instructors-list', async () => {
  const [field, dir] = sortValue.value.split('-') as [string, string]

  // Two-step search on profile fields
  let userIdFilter: string[] | null = null
  if (search.value) {
    const { data: matched } = await supabase
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.%${search.value}%,email.ilike.%${search.value}%,username.ilike.%${search.value}%`)
    userIdFilter = (matched ?? []).map(p => p.id)
    resolvedUserIds.value = userIdFilter.length > 0 ? userIdFilter : []
    if (userIdFilter.length === 0) return { data: [] as InstructorWithProfile[], count: 0 }
  } else {
    resolvedUserIds.value = null
  }

  let q = supabase
    .from('instructors')
    .select('id, user_id, note, deleted_at, created_at, updated_at, provinces, district, profile:profiles(id, full_name, username, email, avatar_url, phone)', { count: 'exact' })
    .order(field === 'name' ? 'created_at' : field, { ascending: dir === 'asc' })

  if (filterDeleted.value === 'true') {
    q = q.not('deleted_at', 'is', null)
  } else {
    q = q.is('deleted_at', null)
  }

  if (filterProvince.value) q = q.eq('provinces', filterProvince.value)
  if (filterDistrict.value) q = q.eq('district', filterDistrict.value)
  if (userIdFilter) q = q.in('user_id', userIdFilter)

  const { data, count, error } = await q
    .range((page.value - 1) * limit.value, page.value * limit.value - 1)
  if (error) throw error
  return { data: (data ?? []) as unknown as InstructorWithProfile[], count: count ?? 0 }
}, {
  default: () => ({ data: [] as InstructorWithProfile[], count: 0 }),
  watch: [sortValue, page, limit]
})

watchDebounced([search, filterProvince, filterDistrict, filterDeleted], async () => {
  page.value = 1
  await refresh()
}, { debounce: 400, deep: true })

// ─── Stats ────────────────────────────────────────────────────────────────────
const { data: statsData, refresh: refreshStats } = await useAsyncData('instructors-stats', async () => {
  const [active, deleted] = await Promise.all([
    supabase.from('instructors').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('instructors').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null)
  ])
  return { active: active.count ?? 0, deleted: deleted.count ?? 0 }
}, { default: () => ({ active: 0, deleted: 0 }) })

async function refreshAll() {
  await Promise.all([refresh(), refreshStats()])
}

// ─── Modal state ──────────────────────────────────────────────────────────────
const addOpen = ref(false)
const detailOpen = ref(false)
const editOpen = ref(false)
const deleteOpen = ref(false)
const bulkImportOpen = ref(false)
const deleteMode = ref<'soft' | 'hard'>('soft')
const selectedInstructor = ref<InstructorWithProfile | null>(null)
const deleteTargets = ref<InstructorWithProfile[]>([])

function openDetail(instructor: InstructorWithProfile) {
  selectedInstructor.value = instructor
  detailOpen.value = true
}

function openEdit(instructor: InstructorWithProfile) {
  selectedInstructor.value = instructor
  editOpen.value = true
  detailOpen.value = false
}

function openDelete(targets: InstructorWithProfile[], mode: 'soft' | 'hard' = 'soft') {
  deleteTargets.value = targets
  deleteMode.value = mode
  deleteOpen.value = true
}

// ─── Restore ──────────────────────────────────────────────────────────────────
async function restoreInstructor(instructor: InstructorWithProfile) {
  const { error } = await supabase.from('instructors')
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq('id', instructor.id)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'Penyuluh dipulihkan', color: 'success', duration: 2000 })
  await refreshAll()
}

// ─── Export ───────────────────────────────────────────────────────────────────
function buildExportRows() {
  const rows = getSelectedRows().length > 0 ? getSelectedRows() : (instructorData.value?.data ?? [])
  return rows.map(i => ({
    id: i.id,
    namaLengkap: i.profile?.full_name ?? '-',
    email: i.profile?.email ?? '-',
    username: i.profile?.username ?? '-',
    telepon: i.profile?.phone ?? '-',
    provinsi: i.provinces ?? '-',
    kabupaten: i.district ?? '-',
    catatan: i.note ?? '-',
    terdaftarFmt: format(new Date(i.created_at), 'dd MMM yyyy', { locale: localeId })
  }))
}

function buildExportColumns(): ExportColumn[] {
  return [
    { key: 'id', header: 'ID Penyuluh' },
    { key: 'namaLengkap', header: 'Nama Lengkap' },
    { key: 'email', header: 'Email' },
    { key: 'username', header: 'Username' },
    { key: 'telepon', header: 'Telepon' },
    { key: 'provinsi', header: 'Provinsi' },
    { key: 'kabupaten', header: 'Kabupaten/Kota' },
    { key: 'catatan', header: 'Catatan' },
    { key: 'terdaftarFmt', header: 'Terdaftar Sejak' }
  ]
}

async function handleExportPdf() {
  await exportToPdf(buildExportRows(), buildExportColumns(), `jurutani-instructors-${Date.now()}`, 'Daftar Penyuluh')
}

async function handleExportExcel() {
  await exportToExcel(buildExportRows(), buildExportColumns(), `jurutani-instructors-${Date.now()}`, 'Penyuluh')
}

// ─── Row actions ──────────────────────────────────────────────────────────────
function rowActions(item: InstructorWithProfile) {
  const isDeleted = !!item.deleted_at
  return isDeleted
    ? [[
        { label: 'Pulihkan', icon: 'i-lucide-undo-2', onSelect: () => restoreInstructor(item) },
        { label: 'Hapus Permanen', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => openDelete([item], 'hard') }
      ]]
    : [
        [
          { label: 'Detail', icon: 'i-lucide-eye', onSelect: () => openDetail(item) },
          { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEdit(item) }
        ],
        [
          { label: 'Hapus', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => openDelete([item]) }
        ]
      ]
}

// ─── Table columns ────────────────────────────────────────────────────────────
const columns: TableColumn<InstructorWithProfile>[] = [
  {
    id: 'select',
    enableHiding: false,
    header: ({ table: t }) =>
      h(UCheckbox, {
        'id': 'instructor-select-all',
        'modelValue': t.getIsSomePageRowsSelected() ? 'indeterminate' : t.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => t.toggleAllPageRowsSelected(!!v),
        'ariaLabel': 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        'id': `instructor-select-${row.id}`,
        'modelValue': row.getIsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
        'ariaLabel': 'Select row'
      })
  },
  {
    id: 'user',
    header: 'Penyuluh',
    cell: ({ row }) => {
      const i = row.original
      const name = i.profile?.full_name ?? i.profile?.username ?? '—'
      const email = i.profile?.email ?? ''
      return h('div', { class: 'flex items-center gap-3' }, [
        h(UAvatar, { src: i.profile?.avatar_url ?? undefined, alt: name, size: 'sm' }),
        h('div', { class: 'min-w-0' }, [
          h('p', { class: 'font-medium text-highlighted truncate max-w-48' }, name),
          email
            ? h('a', {
                href: `mailto:${email}`,
                class: 'text-xs text-primary hover:underline truncate max-w-48 block'
              }, email)
            : h('p', { class: 'text-xs text-muted truncate max-w-48' }, '—')
        ])
      ])
    }
  },
  {
    id: 'location',
    header: 'Wilayah',
    cell: ({ row }) => {
      const i = row.original
      if (!i.provinces && !i.district) return h('span', { class: 'text-muted text-sm' }, '—')
      return h('div', { class: 'min-w-0' }, [
        i.provinces ? h('p', { class: 'text-sm text-highlighted truncate max-w-40' }, i.provinces) : null,
        i.district ? h('p', { class: 'text-xs text-muted truncate max-w-40' }, i.district) : null
      ])
    }
  },
  {
    id: 'note',
    header: 'Catatan',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted truncate max-w-40 block' }, row.original.note ?? '—')
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) =>
      row.original.deleted_at
        ? h(UBadge, { color: 'error', variant: 'soft' }, () => 'Dihapus')
        : h(UBadge, { color: 'success', variant: 'soft' }, () => 'Aktif')
  },
  {
    accessorKey: 'created_at',
    header: 'Terdaftar',
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
  user: 'Penyuluh', location: 'Wilayah', note: 'Catatan', status: 'Status', created_at: 'Terdaftar'
}

const provinceOptions = computed(() =>
  [...new Set((allDistricts.value ?? []).map(d => d.province))].sort().map(p => ({ label: p, value: p }))
)

const districtOptions = computed(() =>
  (allDistricts.value ?? [])
    .filter(d => d.province === filterProvince.value)
    .map(d => ({ label: d.name, value: d.name }))
)

const instructorCsvQuery = computed(() => {
  let q = supabase
    .from('instructors')
    .select('id, user_id, note, deleted_at, created_at, provinces, district, profile:profiles(id, full_name, username, email, phone)')
  if (filterDeleted.value === 'true') {
    q = q.not('deleted_at', 'is', null)
  } else {
    q = q.is('deleted_at', null)
  }
  if (filterProvince.value) q = q.eq('provinces', filterProvince.value)
  if (filterDistrict.value) q = q.eq('district', filterDistrict.value)
  if (resolvedUserIds.value !== null) {
    const ids = resolvedUserIds.value.length > 0 ? resolvedUserIds.value : ['00000000-0000-0000-0000-000000000000']
    q = q.in('user_id', ids)
  }
  return q
})

const stats = computed(() => [
  { key: 'false', label: 'Aktif', count: statsData.value?.active, icon: 'i-lucide-book-open', color: 'text-warning', bg: 'bg-warning/10' },
  { key: 'true', label: 'Dihapus', count: statsData.value?.deleted, icon: 'i-lucide-user-x', color: 'text-error', bg: 'bg-error/10' }
])
</script>

<template>
  <UDashboardPanel id="instructors">
    <template #header>
      <UDashboardNavbar title="Instructors" :ui="{ right: 'gap-2' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UDropdownMenu
            :items="[
              [{ label: 'Export PDF', icon: 'i-lucide-file-text', onSelect: handleExportPdf }],
              [{ label: 'Export Excel', icon: 'i-lucide-file-spreadsheet', onSelect: handleExportExcel }]
            ]"
            :content="{ align: 'end' }"
          >
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-download"
              label="Export"
              trailing-icon="i-lucide-chevron-down"
            />
          </UDropdownMenu>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-file-up"
            label="Import"
            @click="bulkImportOpen = true"
          />
          <UButton
            color="primary"
            icon="i-lucide-plus"
            label="Tambah Penyuluh"
            @click="addOpen = true"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Stats -->
      <div class="grid grid-cols-2 gap-3 mb-5">
        <button
          v-for="stat in stats"
          :key="stat.key"
          class="flex items-center gap-3 p-3 rounded-lg border border-default bg-elevated cursor-pointer text-left transition-all hover:bg-elevated/80"
          :class="filterDeleted === stat.key ? 'ring-2 ring-primary' : ''"
          @click="filterDeleted = stat.key"
        >
          <div class="size-9 rounded-lg flex items-center justify-center shrink-0" :class="stat.bg">
            <UIcon :name="stat.icon" class="size-5" :class="stat.color" />
          </div>
          <div>
            <p class="text-2xl font-bold text-highlighted leading-none">
              {{ stat.count ?? 0 }}
            </p>
            <p class="text-xs text-muted mt-0.5">
              {{ stat.label }}
            </p>
          </div>
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="Cari penyuluh..."
          class="min-w-56"
        />
        <USelectMenu
          v-model="filterProvince"
          :items="provinceOptions"
          placeholder="Semua provinsi"
          value-key="value"
          class="min-w-44"
        />
        <USelectMenu
          v-model="filterDistrict"
          :items="districtOptions"
          placeholder="Semua kabupaten/kota"
          value-key="value"
          class="min-w-48"
          :disabled="!filterProvince"
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
            @click="refreshAll()"
          />
        </div>
      </div>

      <!-- Table -->
      <UTable
        ref="table"
        v-model:row-selection="rowSelection"
        v-model:column-visibility="columnVisibility"
        :data="instructorData?.data ?? []"
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
        :total="instructorData?.count ?? 0"
        :query="instructorCsvQuery"
        label="penyuluh"
      />
    </template>
  </UDashboardPanel>

  <!-- Bulk actions bar -->
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
      <UButton
        label="Export"
        icon="i-lucide-download"
        size="sm"
        variant="ghost"
        color="neutral"
        @click="handleExportExcel"
      />
      <UButton
        label="Hapus"
        icon="i-lucide-trash-2"
        size="sm"
        variant="ghost"
        color="error"
        @click="openDelete(getSelectedRows())"
      />
      <USeparator orientation="vertical" class="h-5" />
      <UButton
        icon="i-lucide-x"
        size="sm"
        variant="ghost"
        color="neutral"
        @click="clearSelection"
      />
    </div>
  </Transition>

  <!-- Modals & Slideovers -->
  <InstructorsAddModal v-model:open="addOpen" @saved="refreshAll()" />

  <InstructorsDetailSlideover
    v-model:open="detailOpen"
    :instructor="selectedInstructor"
    @edit="openEdit"
  />

  <InstructorsEditModal
    v-model:open="editOpen"
    :instructor="selectedInstructor"
    @saved="refreshAll()"
  />

  <InstructorsDeleteModal
    v-model:open="deleteOpen"
    :targets="deleteTargets"
    :mode="deleteMode"
    @deleted="clearSelection(); refreshAll()"
  />

  <InstructorsBulkImportModal
    v-model:open="bulkImportOpen"
    @saved="refreshAll()"
  />
</template>
