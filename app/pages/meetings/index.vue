<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { Database } from '~/types/database.types'
import type { EmbedItem } from '~/utils/embed'

type MeetingRow = Database['public']['Tables']['meeting_schedules']['Row'] & {
  author?: { id: string, full_name: string | null, username: string | null, avatar_url: string | null } | null
}

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')
const UAvatar = resolveComponent('UAvatar')
const UIcon = resolveComponent('UIcon')

useHead({ title: 'Meeting Schedules – Jurutani Admin' })

const supabase = useSupabaseClient()
const toast = useToast()
const table = useTemplateRef('table')

// ─── State ───────────────────────────────────────────────────────────────────
const rowSelection = ref<Record<string, boolean>>({})
const columnVisibility = ref<Record<string, boolean>>({})

const search = useRouteQuery<string | undefined>('search', undefined, { resetKeys: ['page'] })
const filterArchived = useRouteQuery<string>('archived', 'active', { resetKeys: ['page'] })
const sortValue = useRouteQuery('sort', 'created_at-desc', { resetKeys: ['page'] })
const page = useRouteQuery('page', 1)
const limit = useRouteQuery('limit', 15, { resetKeys: ['page'] })

const selectedCount = computed(() => Object.values(rowSelection.value).filter(Boolean).length)

function getSelectedRows(): MeetingRow[] {
  return table.value?.tableApi
    ?.getFilteredSelectedRowModel()
    .rows.map((r: Row<MeetingRow>) => r.original) ?? []
}

function clearSelection() {
  rowSelection.value = {}
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const meetingQuery = computed(() => {
  const [field, dir] = sortValue.value.split('-') as [string, string]
  let q = supabase
    .from('meeting_schedules')
    .select('*, author:profiles(id, full_name, username, avatar_url)', { count: 'exact' })
    .is('deleted_at', null)
    .order(field, { ascending: dir === 'asc' })

  const archived = filterArchived.value as string
  if (archived === 'active') q = q.is('archived_at', null)
  if (archived === 'archived') q = q.not('archived_at', 'is', null)
  if (search.value) q = q.ilike('title', `%${search.value}%`)

  return q
})

const { data: meetingData, refresh, pending } = await useAsyncData('meeting-schedules-list', async () => {
  const { data, count, error } = await meetingQuery.value
    .range((page.value - 1) * limit.value, page.value * limit.value - 1)
  if (error) throw error
  return { data: (data ?? []) as MeetingRow[], count: count ?? 0 }
}, {
  default: () => ({ data: [] as MeetingRow[], count: 0 }),
  watch: [sortValue, page, limit]
})

watchDebounced([search, filterArchived], async () => {
  page.value = 1
  await refresh()
}, { debounce: 400, deep: true })

// ─── Archive / Restore ────────────────────────────────────────────────────────
async function toggleArchive(item: MeetingRow) {
  const archived_at = item.archived_at ? null : new Date().toISOString()
  const { error } = await supabase
    .from('meeting_schedules')
    .update({ archived_at })
    .eq('id', item.id)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  await refresh()
  toast.add({ title: archived_at ? 'Diarsipkan' : 'Dipulihkan', color: 'success', duration: 2000 })
}

async function bulkArchive() {
  const selected = getSelectedRows()
  if (!selected.length) return
  const ids = selected.map(r => r.id)
  const { error } = await supabase
    .from('meeting_schedules')
    .update({ archived_at: new Date().toISOString() })
    .in('id', ids)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  await refresh()
  clearSelection()
  toast.add({ title: `${ids.length} meeting diarsipkan`, color: 'success' })
}

// ─── Permanent delete ─────────────────────────────────────────────────────────
const deleteConfirmOpen = ref(false)
const deleteTargetRows = ref<MeetingRow[]>([])
const deleteLoading = ref(false)

function openDeleteConfirm(rows: MeetingRow[]) {
  deleteTargetRows.value = rows
  deleteConfirmOpen.value = true
}

async function confirmPermanentDelete() {
  const rows = deleteTargetRows.value
  if (!rows.length) return
  deleteLoading.value = true
  try {
    const ids: string[] = (rows as { id: string }[]).map(r => r.id)
    const { error } = await supabase.from('meeting_schedules').delete().in('id', ids)
    if (error) throw error
    toast.add({ title: `${ids.length} meeting dihapus permanen`, color: 'success' })
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

// ─── Export ──────────────────────────────────────────────────────────────────
function buildExportColumns(): ExportColumn[] {
  return [
    { key: 'title', header: 'Judul' },
    { key: 'embedsCount', header: 'Jumlah Embed' },
    { key: 'content', header: 'Catatan' },
    { key: 'authorName', header: 'Author' },
    { key: 'archivedFmt', header: 'Diarsipkan' },
    { key: 'createdFmt', header: 'Dibuat' }
  ]
}

function buildExportRows() {
  const rows = getSelectedRows().length > 0 ? getSelectedRows() : (meetingData.value?.data ?? [])
  return rows.map(m => ({
    ...m,
    embedsCount: parseEmbeds(m.embeds).length,
    authorName: m.author?.full_name ?? m.author?.username ?? '-',
    archivedFmt: m.archived_at ? format(new Date(m.archived_at), 'dd MMM yyyy', { locale: localeId }) : '-',
    createdFmt: format(new Date(m.created_at), 'dd MMM yyyy', { locale: localeId })
  }))
}

async function handleExportPdf() {
  await exportToPdf(buildExportRows(), buildExportColumns(), `jurutani-meetings-${Date.now()}`, 'Daftar Meeting Schedules')
}

async function handleExportExcel() {
  await exportToExcel(buildExportRows(), buildExportColumns(), `jurutani-meetings-${Date.now()}`, 'Meetings')
}

// ─── Row actions ─────────────────────────────────────────────────────────────
function rowActions(item: MeetingRow) {
  return [
    [
      { label: 'Preview', icon: 'i-lucide-eye', to: `/meetings/preview/${item.id}` },
      { label: 'Edit', icon: 'i-lucide-pencil', to: `/meetings/${item.id}/edit` }
    ],
    [
      {
        label: item.archived_at ? 'Pulihkan' : 'Arsipkan',
        icon: item.archived_at ? 'i-lucide-archive-restore' : 'i-lucide-archive',
        onSelect: () => toggleArchive(item)
      }
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
const columns: TableColumn<MeetingRow>[] = [
  {
    id: 'select',
    enableHiding: false,
    header: ({ table: t }) =>
      h(UCheckbox, {
        id: 'meeting-select-all',
        modelValue: t.getIsSomePageRowsSelected() ? 'indeterminate' : t.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => t.toggleAllPageRowsSelected(!!v),
        ariaLabel: 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        id: `meeting-select-${row.id}`,
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
        ariaLabel: 'Select row'
      })
  },
  {
    accessorKey: 'title',
    header: 'Judul',
    cell: ({ row }) => {
      const count = parseEmbeds(row.original.embeds).length
      return h('div', { class: 'min-w-0' }, [
        h('p', { class: 'font-medium text-highlighted truncate max-w-xs' }, row.original.title),
        h('p', { class: 'text-xs text-muted' }, `${count} embed`)
      ])
    }
  },
  {
    id: 'platforms',
    header: 'Platform',
    cell: ({ row }) => {
      const embeds = parseEmbeds(row.original.embeds)
      const platforms = [...new Set(embeds.map(e => e.platform))]
      if (!platforms.length) return h('span', { class: 'text-muted text-sm' }, '-')
      return h('div', { class: 'flex items-center gap-1.5 flex-wrap' },
        platforms.map(p => {
          const info = Enum.EmbedPlatforms.find(x => x.value === p)
          return h(UIcon, {
            name: info?.icon ?? 'i-lucide-globe',
            class: `size-4 text-${info?.color ?? 'neutral'}-500`,
            title: info?.label ?? p
          })
        })
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
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      if (row.original.archived_at) {
        return h(UBadge, { variant: 'subtle', color: 'warning' }, () => 'Archived')
      }
      return h(UBadge, { variant: 'subtle', color: 'success' }, () => 'Active')
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
  title: 'Judul',
  platforms: 'Platform',
  author: 'Author',
  status: 'Status',
  created_at: 'Dibuat'
}

const archivedOptions = [
  { label: 'Aktif', value: 'active' },
  { label: 'Diarsipkan', value: 'archived' },
  { label: 'Semua', value: 'all' }
]
</script>

<template>
  <UDashboardPanel id="meetings">
    <template #header>
      <UDashboardNavbar title="Meeting Schedules" :ui="{ right: 'gap-2' }">
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
            to="/meetings/create"
            icon="i-lucide-plus"
            label="Buat Meeting"
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
          placeholder="Cari judul meeting..."
          class="min-w-52"
        />
        <USelect
          v-model="filterArchived"
          :items="archivedOptions"
          value-key="value"
          label-key="label"
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
        :data="meetingData?.data ?? []"
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
        :total="meetingData?.count ?? 0"
        :query="meetingQuery"
        label="meeting"
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
      <UButton
        color="warning"
        variant="soft"
        icon="i-lucide-archive"
        label="Arsipkan"
        size="sm"
        @click="bulkArchive"
      />
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
      <UButton color="neutral" variant="ghost" icon="i-lucide-x" size="sm" @click="clearSelection" />
    </div>
  </Transition>

  <!-- Confirm delete modal -->
  <UModal
    v-model:open="deleteConfirmOpen"
    :title="`Hapus ${deleteTargetRows.length} Meeting Secara Permanen?`"
    description="Tindakan ini tidak dapat dibatalkan. Semua data akan dihapus dari sistem."
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <ul v-if="deleteTargetRows.length <= 5" class="space-y-1 mb-4">
        <li
          v-for="row in deleteTargetRows"
          :key="row.id"
          class="text-sm text-highlighted flex items-center gap-2"
        >
          <UIcon name="i-lucide-calendar" class="size-4 text-muted shrink-0" />
          {{ row.title }}
        </li>
      </ul>
      <p v-else class="text-sm text-muted mb-4">
        {{ deleteTargetRows.length }} meeting akan dihapus.
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
