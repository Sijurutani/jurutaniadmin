<script setup lang="ts">
import { format } from 'date-fns'
import type { TableColumn } from '@nuxt/ui'
import type { Row } from '@tanstack/table-core'
import type { Database } from '~/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type AuthInfo = {
  display_name: string | null
  email: string | null
  email_confirmed: boolean
  last_sign_in_at: string | null
  banned_until: string | null
}

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UCheckbox = resolveComponent('UCheckbox')
const UAvatar = resolveComponent('UAvatar')

useHead({ title: 'Users' })

const supabase = useSupabase()
const toast = useToast()
const table = useTemplateRef('table')

// ─── Selection ────────────────────────────────────────────────────────────────
const rowSelection = ref<Record<string, boolean>>({})
const columnVisibility = ref<Record<string, boolean>>({})
const selectedCount = computed(() => Object.values(rowSelection.value).filter(Boolean).length)

function getSelectedRows(): ProfileRow[] {
  return table.value?.tableApi
    ?.getFilteredSelectedRowModel()
    .rows.map((r: Row<ProfileRow>) => r.original) ?? []
}

function clearSelection() { rowSelection.value = {} }

// ─── Filters ──────────────────────────────────────────────────────────────────
const search = useRouteQuery<string | undefined>('search', undefined, { resetKeys: ['page'] })
const filterRole = useRouteQuery('role', [] as string[], { resetKeys: ['page'] })
const filterStatus = useRouteQuery('status', 'active', { resetKeys: ['page'] })
const sortValue = useRouteQuery('sort', 'created_at-desc', { resetKeys: ['page'] })
const page = useRouteQuery('page', 1)
const limit = useRouteQuery('limit', 15, { resetKeys: ['page'] })

// ─── Profiles query ───────────────────────────────────────────────────────────
const userQuery = computed(() => {
  const [field, dir] = sortValue.value.split('-') as [string, string]
  const dbField = field === 'name' ? 'full_name' : field

  let q = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order(dbField, { ascending: dir === 'asc' })

  if (filterStatus.value === 'deleted') {
    q = q.not('deleted_at', 'is', null)
  } else if (filterStatus.value === 'archived') {
    q = q.is('deleted_at', null).not('archived_at', 'is', null)
  } else {
    q = q.is('deleted_at', null).is('archived_at', null)
  }

  if (filterRole.value?.length) q = q.in('role', filterRole.value)
  if (search.value) {
    q = q.or(`full_name.ilike.%${search.value}%,username.ilike.%${search.value}%,email.ilike.%${search.value}%`)
  }
  return q
})

const { data: userData, refresh, pending } = await useAsyncData('user-list', async () => {
  const { data, count, error } = await userQuery.value
    .range((page.value - 1) * limit.value, page.value * limit.value - 1)
  if (error) throw error
  return { data: (data ?? []) as ProfileRow[], count: count ?? 0 }
}, {
  default: () => ({ data: [] as ProfileRow[], count: 0 }),
  watch: [sortValue, page, limit]
})

watchDebounced([search, filterRole, filterStatus], async () => {
  page.value = 1
  await refresh()
}, { debounce: 400, deep: true })

// ─── Auth batch data ──────────────────────────────────────────────────────────
const authMap = ref<Record<string, AuthInfo>>({})

watch(userData, async (val) => {
  const ids = val?.data?.map(u => u.id) ?? []
  if (!ids.length) { authMap.value = {}; return }
  try {
    const result = await $fetch<Record<string, AuthInfo>>('/api/users/batch', {
      method: 'POST',
      body: { ids }
    })
    authMap.value = result
  } catch { /* silent */ }
}, { immediate: true })

// ─── Stats ────────────────────────────────────────────────────────────────────
const { data: statsData } = await useAsyncData('user-stats', async () => {
  const [active, archived, deleted] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null).is('archived_at', null),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null).not('archived_at', 'is', null),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null)
  ])
  return { active: active.count ?? 0, archived: archived.count ?? 0, deleted: deleted.count ?? 0 }
}, { default: () => ({ active: 0, archived: 0, deleted: 0 }) })

// ─── Per-row actions ──────────────────────────────────────────────────────────
async function softDeleteUser(user: ProfileRow) {
  const { error } = await supabase.from('profiles')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'User deleted', color: 'success', duration: 2000 })
  await refresh()
}

async function restoreUser(user: ProfileRow) {
  const { error } = await supabase.from('profiles')
    .update({ deleted_at: null, archived_at: null, updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'User restored', color: 'success', duration: 2000 })
  await refresh()
}

async function archiveUser(user: ProfileRow) {
  const { error } = await supabase.from('profiles')
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', user.id)
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'User archived', color: 'success', duration: 2000 })
  await refresh()
}

// ─── Bulk actions ─────────────────────────────────────────────────────────────
const bulkLoading = ref(false)

async function bulkArchive() {
  const rows = getSelectedRows().filter(r => !r.deleted_at && !r.archived_at)
  if (!rows.length) {
    toast.add({ title: 'No eligible users to archive', color: 'warning', duration: 2000 })
    return
  }
  bulkLoading.value = true
  const { error } = await supabase.from('profiles')
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .in('id', rows.map(r => r.id))
  bulkLoading.value = false
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: `${rows.length} user(s) archived`, color: 'success', duration: 2000 })
  clearSelection()
  await refresh()
}

async function bulkSoftDelete() {
  const rows = getSelectedRows()
  if (!rows.length) return
  bulkLoading.value = true
  const { error } = await supabase.from('profiles')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .in('id', rows.map(r => r.id))
  bulkLoading.value = false
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: `${rows.length} user(s) deleted`, color: 'success', duration: 2000 })
  clearSelection()
  await refresh()
}

// ─── Row actions menu ─────────────────────────────────────────────────────────
function rowActions(item: ProfileRow) {
  const isDeleted = !!item.deleted_at
  const isArchived = !isDeleted && !!item.archived_at
  const isActive = !isDeleted && !isArchived

  return [
    [{ label: 'View Details', icon: 'i-lucide-external-link', to: `/users/${item.id}` }],
    [
      ...(isActive ? [
        { label: 'Archive', icon: 'i-lucide-archive', onSelect: () => archiveUser(item) },
        { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => softDeleteUser(item) }
      ] : []),
      ...(isArchived ? [
        { label: 'Restore', icon: 'i-lucide-undo-2', onSelect: () => restoreUser(item) },
        { label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => softDeleteUser(item) }
      ] : []),
      ...(isDeleted ? [
        { label: 'Restore', icon: 'i-lucide-undo-2', onSelect: () => restoreUser(item) }
      ] : [])
    ]
  ]
}

// ─── Table columns ────────────────────────────────────────────────────────────
const columns: TableColumn<ProfileRow>[] = [
  {
    id: 'select',
    enableHiding: false,
    header: ({ table: t }) =>
      h(UCheckbox, {
        id: 'user-select-all',
        modelValue: t.getIsSomePageRowsSelected() ? 'indeterminate' : t.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => t.toggleAllPageRowsSelected(!!v),
        ariaLabel: 'Select all'
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        id: `user-select-${row.id}`,
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (v: boolean | 'indeterminate') => row.toggleSelected(!!v),
        ariaLabel: 'Select row'
      })
  },
  {
    id: 'user',
    header: 'User',
    cell: ({ row }) => {
      const u = row.original
      const auth = authMap.value[u.id]
      const displayName = auth?.display_name ?? u.full_name ?? u.username ?? '—'
      const email = auth?.email ?? u.email ?? ''
      return h('div', { class: 'flex items-center gap-3' }, [
        h(UAvatar, { src: u.avatar_url ?? undefined, alt: displayName, size: 'sm' }),
        h('div', { class: 'min-w-0' }, [
          h('p', { class: 'font-medium text-highlighted truncate max-w-48' }, displayName),
          h('p', { class: 'text-xs text-muted truncate max-w-48' }, email)
        ])
      ])
    }
  },
  {
    accessorKey: 'username',
    header: 'Username',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted font-mono' },
        row.original.username ? `@${row.original.username}` : '—')
  },
  {
    accessorKey: 'full_name',
    header: 'Full Name',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-highlighted' }, row.original.full_name ?? '—')
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const r = Enum.UserRole.find(x => x.value === row.original.role)
      if (!r) return h('span', { class: 'text-muted text-sm' }, '—')
      return h(UBadge, { color: r.color as any, variant: 'soft', leadingIcon: r.icon, class: 'capitalize' }, () => r.label)
    }
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const u = row.original
      if (u.deleted_at) return h(UBadge, { color: 'error', variant: 'soft' }, () => 'Deleted')
      if (u.archived_at) return h(UBadge, { color: 'warning', variant: 'soft' }, () => 'Archived')
      return h(UBadge, { color: 'success', variant: 'soft' }, () => 'Active')
    }
  },
  {
    accessorKey: 'created_at',
    header: 'Joined',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted whitespace-nowrap' },
        format(new Date(row.original.created_at), 'dd MMM yyyy'))
  },
  {
    id: 'actions',
    enableHiding: false,
    cell: ({ row }) =>
      h('div', { class: 'text-right' },
        h(UDropdownMenu, {
          items: rowActions(row.original),
          content: { align: 'end' }
        }, () => h(UButton, {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          class: 'ml-auto'
        }))
      )
  }
]

const columnLabels: Record<string, string> = {
  user: 'User', username: 'Username', full_name: 'Full Name',
  role: 'Role', status: 'Status', created_at: 'Joined'
}

const roleOptions = Enum.UserRole.map(r => ({ label: r.label, value: r.value }))
const statusOptions = [
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
  { label: 'Deleted', value: 'deleted' }
]

const stats = computed(() => [
  { key: 'active', label: 'Active', count: statsData.value?.active, icon: 'i-lucide-users', color: 'text-success', bg: 'bg-success/10' },
  { key: 'archived', label: 'Archived', count: statsData.value?.archived, icon: 'i-lucide-archive', color: 'text-warning', bg: 'bg-warning/10' },
  { key: 'deleted', label: 'Deleted', count: statsData.value?.deleted, icon: 'i-lucide-user-x', color: 'text-error', bg: 'bg-error/10' }
])
</script>

<template>
  <UDashboardPanel id="users">
    <template #header>
      <UDashboardNavbar title="Users">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3 mb-5">
        <button
          v-for="stat in stats"
          :key="stat.key"
          class="flex items-center gap-3 p-3 rounded-lg border border-default bg-elevated cursor-pointer text-left transition-all hover:bg-elevated/80"
          :class="filterStatus === stat.key ? 'ring-2 ring-primary' : ''"
          @click="filterStatus = stat.key"
        >
          <div
            class="size-9 rounded-lg flex items-center justify-center shrink-0"
            :class="stat.bg"
          >
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
          placeholder="Search users..."
          class="min-w-56"
        />
        <USelectMenu
          v-model="filterRole"
          :items="roleOptions"
          placeholder="All roles"
          multiple
          value-key="value"
          class="min-w-36"
        />
        <USelect
          v-model="filterStatus"
          :items="statusOptions"
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
              label="Columns"
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
        :data="userData?.data ?? []"
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
        :total="userData?.count ?? 0"
        :query="userQuery"
        label="user"
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
      <span class="text-sm font-medium text-highlighted">{{ selectedCount }} selected</span>
      <USeparator orientation="vertical" class="h-5" />
      <UButton
        label="Archive"
        icon="i-lucide-archive"
        size="sm"
        variant="ghost"
        color="warning"
        :loading="bulkLoading"
        @click="bulkArchive"
      />
      <UButton
        label="Delete"
        icon="i-lucide-trash-2"
        size="sm"
        variant="ghost"
        color="error"
        :loading="bulkLoading"
        @click="bulkSoftDelete"
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
</template>
