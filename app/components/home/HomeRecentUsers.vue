<script setup lang="ts">
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

const supabase = useSupabase()

const { data: users } = await useAsyncData('dashboard-recent-users', async () => {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, username, email, avatar_url, role, created_at')
    .not('role', 'in', '("admin","superadmin")')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(8)
  return data ?? []
}, { default: () => [] })

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
          :alt="user.full_name ?? user.email ?? ''"
          size="sm"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-highlighted truncate leading-tight">
            {{ user.full_name || user.username || '(tanpa nama)' }}
          </p>
          <p class="text-xs text-muted truncate">
            {{ user.email }}
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
