<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { TableColumn } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

const UBadge = resolveComponent('UBadge')
const UAvatar = resolveComponent('UAvatar')

const supabase = useSupabase()

const { data: recentUsers } = await useAsyncData('user-recent-list', async () => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)
  return (data ?? []) as ProfileRow[]
}, { default: () => [] as ProfileRow[] })

const columns: TableColumn<ProfileRow>[] = [
  {
    id: 'user',
    header: 'Pengguna',
    cell: ({ row }) => {
      const u = row.original
      return h('div', { class: 'flex items-center gap-3' }, [
        h(UAvatar, { src: u.avatar_url ?? undefined, alt: u.full_name ?? 'User', size: 'sm' }),
        h('div', { class: 'min-w-0' }, [
          h('p', { class: 'font-medium text-highlighted truncate max-w-44' }, u.full_name ?? '-'),
          h('p', { class: 'text-xs text-muted truncate max-w-44' }, u.email ?? u.username ?? u.id)
        ])
      ])
    }
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const r = Enum.UserRole.find(x => x.value === row.original.role)
      if (!r) return h('span', { class: 'text-muted text-sm' }, '-')
      return h(UBadge, {
        color: r.color as any,
        variant: 'soft',
        leadingIcon: r.icon,
        class: 'capitalize'
      }, () => r.label)
    }
  },
  {
    id: 'admin',
    header: 'Admin',
    cell: ({ row }) =>
      row.original.is_admin
        ? h(UBadge, { color: 'info', variant: 'solid', leadingIcon: 'i-lucide-shield-check' }, () => 'Admin')
        : h('span', { class: 'text-muted text-sm' }, '-')
  },
  {
    accessorKey: 'created_at',
    header: 'Terdaftar',
    cell: ({ row }) =>
      h('span', { class: 'text-sm text-muted whitespace-nowrap' },
        format(new Date(row.original.created_at), 'dd MMM yyyy', { locale: localeId }))
  }
]
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <p class="font-semibold text-highlighted">
            Registrasi Terbaru
          </p>
          <p class="text-xs text-muted mt-0.5">
            10 pengguna terakhir bergabung
          </p>
        </div>
        <UButton
          to="/users"
          label="Lihat Semua"
          color="neutral"
          variant="soft"
          size="sm"
          trailing-icon="i-lucide-arrow-right"
        />
      </div>
    </template>

    <UTable
      :data="recentUsers ?? []"
      :columns="columns"
      :ui="{
        base: 'table-fixed border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
        td: 'border-b border-default',
      }"
    />
  </UCard>
</template>
