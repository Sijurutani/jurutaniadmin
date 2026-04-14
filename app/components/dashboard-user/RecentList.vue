<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { TableColumn } from '@nuxt/ui'
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
const UAvatar = resolveComponent('UAvatar')
const NuxtLink = resolveComponent('NuxtLink')

const supabase = useSupabaseClient()

const { data: recentUsers } = await useAsyncData('user-recent-list', async () => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)
  return (data ?? []) as ProfileRow[]
}, { default: () => [] as ProfileRow[] })

const authMap = ref<Record<string, AuthInfo>>({})

watch(recentUsers, async (val) => {
  const ids = (val ?? []).map(u => u.id)
  if (!ids.length) {
    authMap.value = {}
    return
  }

  try {
    const result = await $fetch<Record<string, AuthInfo>>('/api/users/batch', {
      method: 'POST',
      body: { ids }
    })
    authMap.value = result
  } catch {
    authMap.value = {}
  }
}, { immediate: true })

function displayName(u: ProfileRow): string {
  const auth = authMap.value[u.id]
  return auth?.display_name ?? u.full_name ?? u.username ?? auth?.email ?? '—'
}

function displayEmail(u: ProfileRow): string {
  const auth = authMap.value[u.id]
  return auth?.email ?? u.email ?? '—'
}

const columns: TableColumn<ProfileRow>[] = [
  {
    id: 'user',
    header: 'Pengguna',
    cell: ({ row }) => {
      const u = row.original
      return h(NuxtLink, { to: `/users/${u.id}`, class: 'inline-flex items-center gap-3 group min-w-0' }, () => [
        h(UAvatar, { src: u.avatar_url ?? undefined, alt: displayName(u), size: 'sm' }),
        h('div', { class: 'min-w-0' }, [
          h('p', { class: 'font-medium text-primary group-hover:underline truncate max-w-44' }, displayName(u)),
          h('p', { class: 'text-xs text-muted truncate max-w-44' }, displayEmail(u))
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
