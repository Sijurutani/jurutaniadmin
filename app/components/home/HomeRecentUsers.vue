<script setup lang="ts">
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import type { Database } from '~/types/database.types'

type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'full_name' | 'username' | 'email' | 'avatar_url' | 'role' | 'created_at'
>

type AuthInfo = {
  display_name: string | null
  email: string | null
  email_confirmed: boolean
  last_sign_in_at: string | null
  banned_until: string | null
}

const supabase = useSupabaseClient()

const { data: users } = await useAsyncData('dashboard-recent-users', async () => {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, username, email, avatar_url, role, created_at')
    .not('role', 'in', '("admin","superadmin")')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(8)
  return (data ?? []) as ProfileRow[]
}, { default: () => [] as ProfileRow[] })

const authMap = ref<Record<string, AuthInfo>>({})

watch(users, async (val) => {
  const ids = val?.map(u => u.id) ?? []
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
    // Keep fallback from profile table if auth batch is unavailable
    authMap.value = {}
  }
}, { immediate: true })

const roleConfig: Record<string, { label: string, color: 'info' | 'success' | 'warning' | 'neutral' }> = {
  pakar: { label: 'Pakar', color: 'success' },
  penyuluh: { label: 'Penyuluh', color: 'warning' },
  petani: { label: 'Petani', color: 'neutral' }
}

function getRoleConf(role: string | null) {
  return roleConfig[role ?? ''] ?? { label: role ?? 'User', color: 'neutral' as const }
}

function formatDate(d: string) {
  return format(new Date(d), 'd MMM yyyy', { locale: id })
}

function displayName(user: ProfileRow): string {
  const auth = authMap.value[user.id]
  return auth?.display_name ?? user.full_name ?? user.username ?? '(tanpa nama)'
}

function displayEmail(user: ProfileRow): string {
  const auth = authMap.value[user.id]
  return auth?.email ?? user.email ?? '-'
}
</script>

<template>
  <UCard
    :ui="{
      body: 'p-0 sm:p-0',
      header: 'px-4 py-3 sm:px-4 sm:py-3 flex items-center justify-between'
    }"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-user-check"
          class="size-4 text-blue-500"
        />
        <p class="font-semibold text-highlighted">
          Pengguna Terbaru
        </p>
      </div>
      <NuxtLink to="/users">
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          label="Lihat semua"
          trailing-icon="i-lucide-arrow-right"
        />
      </NuxtLink>
    </template>

    <ul
      role="list"
      class="divide-y divide-default"
    >
      <li
        v-for="user in users"
        :key="user.id"
        class="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated/50 transition-colors"
      >
        <UAvatar
          :src="user.avatar_url ?? undefined"
          :alt="displayName(user)"
          size="sm"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-highlighted truncate leading-tight">
            {{ displayName(user) }}
          </p>
          <p class="text-xs text-muted truncate">
            {{ displayEmail(user) }}
          </p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <UBadge
            :label="getRoleConf(user.role).label"
            :color="getRoleConf(user.role).color"
            variant="subtle"
            size="sm"
            class="hidden sm:inline-flex capitalize"
          />
          <p class="text-xs text-muted whitespace-nowrap">
            {{ formatDate(user.created_at) }}
          </p>
        </div>
      </li>
      <li
        v-if="!users?.length"
        class="py-8 text-center text-sm text-muted"
      >
        Belum ada pengguna terdaftar.
      </li>
    </ul>
  </UCard>
</template>
