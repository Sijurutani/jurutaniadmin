<script setup lang="ts">
import * as z from 'zod'
import { format } from 'date-fns'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

const route = useRoute()
const userId = route.params.id as string

const supabase = useSupabaseClient()
const toast = useToast()

// ─── Profile (from parent cache) ──────────────────────────────────────────────
const { data: profile } = useNuxtData<ProfileRow>(`user-detail-${userId}`)

// ─── Auth data ────────────────────────────────────────────────────────────────
type AuthUser = {
  id: string
  email: string | null
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  banned_until: string | null
  identities: { provider: string; created_at: string | null }[]
}
const { data: authUser, refresh: refreshAuth } = await useFetch<AuthUser>(
  `/api/users/${userId}`,
  { key: `auth-user-${userId}` }
)

// ─── Profile form ─────────────────────────────────────────────────────────────
const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  username: z.string().min(3, 'At least 3 characters').max(50).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  birth_date: z.string().optional().or(z.literal('')),
  website: z.string().url('Invalid URL format').optional().or(z.literal(''))
})
type ProfileSchema = z.output<typeof profileSchema>

const profileLoading = ref(false)
const profileState = reactive<Partial<ProfileSchema>>({
  full_name: '', username: '', phone: '', bio: '', address: '', birth_date: '', website: ''
})

watch(profile, (p) => {
  if (!p || profileLoading.value) return
  profileState.full_name = p.full_name ?? ''
  profileState.username = p.username ?? ''
  profileState.phone = p.phone ?? ''
  profileState.bio = p.bio ?? ''
  profileState.address = p.address ?? ''
  profileState.birth_date = p.birth_date ?? ''
  profileState.website = p.website ?? ''
}, { immediate: true })

async function saveProfile(event: FormSubmitEvent<ProfileSchema>) {
  profileLoading.value = true
  const { error } = await supabase.from('profiles').update({
    full_name: event.data.full_name,
    username: event.data.username || null,
    phone: event.data.phone || null,
    bio: event.data.bio || null,
    address: event.data.address || null,
    birth_date: event.data.birth_date || null,
    website: event.data.website || null,
    updated_at: new Date().toISOString()
  }).eq('id', userId)
  profileLoading.value = false
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'Profile updated', color: 'success', duration: 2000 })
  await refreshNuxtData(`user-detail-${userId}`)
}

// ─── Role & permissions form ──────────────────────────────────────────────────
const roleSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  is_admin: z.boolean()
})
type RoleSchema = z.output<typeof roleSchema>

const roleLoading = ref(false)
const roleState = reactive<Partial<RoleSchema>>({ role: 'petani', is_admin: false })

watch(profile, (p) => {
  if (!p || roleLoading.value) return
  roleState.role = p.role ?? 'petani'
  roleState.is_admin = p.is_admin ?? false
}, { immediate: true })

const roleOptions = Enum.UserRole.map(r => ({ label: r.label, value: r.value, icon: r.icon }))

async function saveRole(event: FormSubmitEvent<RoleSchema>) {
  roleLoading.value = true
  const { error } = await supabase.from('profiles').update({
    role: event.data.role,
    is_admin: event.data.is_admin,
    updated_at: new Date().toISOString()
  }).eq('id', userId)
  roleLoading.value = false
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'Role updated', color: 'success', duration: 2000 })
  await refreshNuxtData(`user-detail-${userId}`)
}

// ─── Danger zone ──────────────────────────────────────────────────────────────
const actionLoading = ref(false)
const banLoading = ref(false)

const isDeleted = computed(() => !!profile.value?.deleted_at)
const isArchived = computed(() => !isDeleted.value && !!profile.value?.archived_at)
const isBanned = computed(() => !!authUser.value?.banned_until)

async function archiveUser() {
  actionLoading.value = true
  const { error } = await supabase.from('profiles')
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', userId)
  actionLoading.value = false
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'User archived', color: 'success', duration: 2000 })
  await refreshNuxtData(`user-detail-${userId}`)
}

async function restoreUser() {
  actionLoading.value = true
  const { error } = await supabase.from('profiles')
    .update({ deleted_at: null, archived_at: null, updated_at: new Date().toISOString() })
    .eq('id', userId)
  actionLoading.value = false
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'User restored', color: 'success', duration: 2000 })
  await refreshNuxtData(`user-detail-${userId}`)
}

async function softDeleteUser() {
  actionLoading.value = true
  const { error } = await supabase.from('profiles')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', userId)
  actionLoading.value = false
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'User deleted', color: 'success', duration: 2000 })
  await refreshNuxtData(`user-detail-${userId}`)
}

async function toggleBan() {
  banLoading.value = true
  try {
    await $fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      body: { action: isBanned.value ? 'unban' : 'ban' }
    })
    toast.add({ title: isBanned.value ? 'User unbanned' : 'User banned', color: 'success', duration: 2000 })
    await refreshAuth()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  } finally {
    banLoading.value = false
  }
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return format(new Date(d), 'dd MMM yyyy, HH:mm')
}
</script>

<template>
  <!-- ─── Profile Section ─────────────────────────────────────────────────── -->
  <UPageCard
    title="Profile"
    description="Update user's personal information and contact details."
    variant="naked"
    orientation="horizontal"
    class="mb-4"
  >
    <UButton
      form="profile-form"
      type="submit"
      label="Save changes"
      color="neutral"
      :loading="profileLoading"
      class="w-fit lg:ms-auto"
    />
  </UPageCard>

  <UPageCard variant="subtle">
    <UForm
      id="profile-form"
      :schema="profileSchema"
      :state="profileState"
      class="space-y-5"
      @submit="saveProfile"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Full Name" name="full_name" required>
          <UInput v-model="profileState.full_name" placeholder="Full name..." class="w-full" />
        </UFormField>
        <UFormField label="Username" name="username">
          <UInput v-model="profileState.username" placeholder="username" class="w-full" />
        </UFormField>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Phone" name="phone">
          <UInput
            v-model="profileState.phone"
            placeholder="+62..."
            leading-icon="i-lucide-phone"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Birth Date" name="birth_date">
          <UInput v-model="profileState.birth_date" type="date" class="w-full" />
        </UFormField>
      </div>

      <UFormField label="Bio" name="bio">
        <UTextarea v-model="profileState.bio" placeholder="Short bio..." :rows="3" class="w-full" />
      </UFormField>

      <UFormField label="Address" name="address">
        <UTextarea v-model="profileState.address" placeholder="Full address..." :rows="2" class="w-full" />
      </UFormField>

      <UFormField label="Website" name="website">
        <UInput
          v-model="profileState.website"
          placeholder="https://..."
          leading-icon="i-lucide-globe"
          class="w-full"
        />
      </UFormField>
    </UForm>
  </UPageCard>

  <!-- ─── Role & Permissions ──────────────────────────────────────────────── -->
  <UPageCard
    title="Role & Permissions"
    description="Control the user's role and admin access level."
    variant="naked"
    orientation="horizontal"
    class="mb-4"
  >
    <UButton
      form="role-form"
      type="submit"
      label="Save changes"
      color="neutral"
      :loading="roleLoading"
      class="w-fit lg:ms-auto"
    />
  </UPageCard>

  <UPageCard variant="subtle">
    <UForm
      id="role-form"
      :schema="roleSchema"
      :state="roleState"
      class="space-y-4"
      @submit="saveRole"
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UFormField label="Role" name="role" required>
          <USelect
            v-model="roleState.role"
            :items="roleOptions"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Admin Access" name="is_admin">
          <div class="flex items-center gap-2 mt-1">
            <USwitch v-model="roleState.is_admin" />
            <span class="text-sm text-muted">
              {{ roleState.is_admin ? 'Admin access enabled' : 'Not an admin' }}
            </span>
          </div>
        </UFormField>
      </div>
    </UForm>
  </UPageCard>

  <!-- ─── Authentication ──────────────────────────────────────────────────── -->
  <UPageCard
    title="Authentication"
    description="Supabase Auth account details — read only."
    variant="naked"
    orientation="horizontal"
    class="mb-4"
  />

  <UPageCard variant="subtle">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
      <div>
        <p class="text-xs text-muted uppercase font-medium tracking-wide mb-1">
          Email
        </p>
        <p class="text-highlighted">
          {{ authUser?.email ?? '—' }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted uppercase font-medium tracking-wide mb-1">
          Email Confirmed
        </p>
        <div class="flex items-center gap-1.5">
          <UIcon
            :name="authUser?.email_confirmed_at ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
            :class="authUser?.email_confirmed_at ? 'text-success' : 'text-error'"
            class="size-4 shrink-0"
          />
          <span class="text-highlighted">
            {{ authUser?.email_confirmed_at ? fmtDate(authUser.email_confirmed_at) : 'Not confirmed' }}
          </span>
        </div>
      </div>
      <div>
        <p class="text-xs text-muted uppercase font-medium tracking-wide mb-1">
          Last Sign In
        </p>
        <p class="text-highlighted">
          {{ fmtDate(authUser?.last_sign_in_at) }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted uppercase font-medium tracking-wide mb-1">
          Login Providers
        </p>
        <div class="flex flex-wrap gap-1.5 mt-0.5">
          <UBadge
            v-for="p in authUser?.identities ?? []"
            :key="p.provider"
            variant="soft"
            color="neutral"
            class="capitalize"
          >
            {{ p.provider }}
          </UBadge>
          <span v-if="!authUser?.identities?.length" class="text-muted">—</span>
        </div>
      </div>
    </div>
  </UPageCard>

  <!-- ─── Danger Zone ──────────────────────────────────────────────────────── -->
  <UPageCard
    title="Danger Zone"
    description="Irreversible or sensitive account actions."
    variant="naked"
    orientation="horizontal"
    class="mb-4"
  />

  <UPageCard variant="subtle" :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch' }">
    <!-- Archive / Restore -->
    <div class="flex items-start justify-between gap-4 p-4 sm:p-6 border-b border-default">
      <div>
        <p class="font-medium text-sm">Archive Account</p>
        <p class="text-xs text-muted mt-0.5">
          Hides the account from active lists without deleting any data.
        </p>
      </div>
      <div class="shrink-0">
        <UButton
          v-if="!isArchived && !isDeleted"
          label="Archive"
          icon="i-lucide-archive"
          color="warning"
          variant="soft"
          size="sm"
          :loading="actionLoading"
          @click="archiveUser"
        />
        <UButton
          v-else-if="isArchived"
          label="Restore"
          icon="i-lucide-undo-2"
          color="neutral"
          variant="soft"
          size="sm"
          :loading="actionLoading"
          @click="restoreUser"
        />
      </div>
    </div>

    <!-- Soft Delete / Restore -->
    <div class="flex items-start justify-between gap-4 p-4 sm:p-6 border-b border-default">
      <div>
        <p class="font-medium text-sm">Delete Account</p>
        <p class="text-xs text-muted mt-0.5">
          Marks the account as deleted. Data is preserved and can be restored.
        </p>
      </div>
      <div class="shrink-0">
        <UButton
          v-if="!isDeleted"
          label="Delete"
          icon="i-lucide-trash-2"
          color="error"
          variant="soft"
          size="sm"
          :loading="actionLoading"
          @click="softDeleteUser"
        />
        <UButton
          v-else
          label="Restore"
          icon="i-lucide-undo-2"
          color="neutral"
          variant="soft"
          size="sm"
          :loading="actionLoading"
          @click="restoreUser"
        />
      </div>
    </div>

    <!-- Ban / Unban -->
    <div class="flex items-start justify-between gap-4 p-4 sm:p-6">
      <div>
        <p class="font-medium text-sm">Ban User</p>
        <p class="text-xs text-muted mt-0.5">
          Prevents the user from signing in. Can be reversed at any time.
        </p>
      </div>
      <div class="shrink-0">
        <UButton
          v-if="!isBanned"
          label="Ban"
          icon="i-lucide-ban"
          color="error"
          variant="soft"
          size="sm"
          :loading="banLoading"
          @click="toggleBan"
        />
        <UButton
          v-else
          label="Unban"
          icon="i-lucide-shield-check"
          color="success"
          variant="soft"
          size="sm"
          :loading="banLoading"
          @click="toggleBan"
        />
      </div>
    </div>
  </UPageCard>
</template>
