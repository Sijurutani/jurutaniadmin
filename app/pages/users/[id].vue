<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

const route = useRoute()
const userId = route.params.id as string

const supabase = useSupabaseClient()

// ─── Profile (shared with child pages via useNuxtData) ────────────────────────
const { data: profile, error: fetchError } = await useAsyncData(
  `user-detail-${userId}`,
  async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) throw error
    return data as ProfileRow
  }
)

if (fetchError.value || !profile.value) {
  throw createError({ statusCode: 404, statusMessage: 'User not found', fatal: true })
}

const roleInfo = computed(() =>
  profile.value ? Enum.UserRole.find(r => r.value === profile.value!.role) : null
)

const isDeleted = computed(() => !!profile.value?.deleted_at)
const isArchived = computed(() => !isDeleted.value && !!profile.value?.archived_at)

// ─── Sub-route navigation (mirrors settings.vue pattern) ─────────────────────
const links = [[
  { label: 'Profile', icon: 'i-lucide-user', to: `/users/${userId}`, exact: true },
  { label: 'Roles', icon: 'i-lucide-badge-check', to: `/users/${userId}/roles` },
  { label: 'News', icon: 'i-lucide-newspaper', to: `/users/${userId}/news` },
  { label: 'Markets', icon: 'i-lucide-shopping-basket', to: `/users/${userId}/markets` }
]] satisfies NavigationMenuItem[][]

useHead({ title: () => profile.value?.full_name ?? 'User Details' })
</script>

<template>
  <UDashboardPanel :id="`user-${userId}`">
    <template #header>
      <UDashboardNavbar :title="profile?.full_name ?? 'User Details'">
        <template #leading>
          <UDashboardSidebarCollapse />
          <UButton
            to="/users"
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            size="xs"
            class="-mx-0.5"
          />
          <UAvatar
            :src="profile?.avatar_url ?? undefined"
            :alt="profile?.full_name ?? 'User'"
            size="2xs"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UNavigationMenu :items="links" highlight class="-mx-1 flex-1" />
        <div class="flex items-center gap-1.5 shrink-0">
          <UBadge v-if="isDeleted" color="error" variant="soft" size="sm">Deleted</UBadge>
          <UBadge v-else-if="isArchived" color="warning" variant="soft" size="sm">Archived</UBadge>
          <UBadge v-else color="success" variant="soft" size="sm">Active</UBadge>
          <UBadge
            v-if="roleInfo"
            :color="roleInfo.color as any"
            variant="soft"
            size="sm"
            :leading-icon="roleInfo.icon"
            class="capitalize"
          >
            {{ roleInfo.label }}
          </UBadge>
          <UBadge v-if="profile?.is_admin" color="info" variant="solid" size="sm" leading-icon="i-lucide-shield-check">
            Admin
          </UBadge>
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-8 w-full lg:max-w-3xl mx-auto">
        <NuxtPage />
      </div>
    </template>
  </UDashboardPanel>
</template>
