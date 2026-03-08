<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Database } from '~/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

type AuthUser = {
  id: string
  email: string | null
  phone: string | null
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  created_at: string
  updated_at: string | null
  banned_until: string | null
  identities: { provider: string; created_at: string | null }[]
}

const props = defineProps<{ profile: ProfileRow }>()
const emit = defineEmits<{ updated: [] }>()

const supabase = useSupabase()
const toast = useToast()

// ─── Auth info ────────────────────────────────────────────────────────────────
const { data: authUser, refresh: refreshAuth } = await useFetch<AuthUser>(
  `/api/users/${props.profile.id}`,
  { key: `auth-user-${props.profile.id}` }
)

// ─── Edit profile modal ───────────────────────────────────────────────────────
const editOpen = ref(false)

// ─── Actions ──────────────────────────────────────────────────────────────────
const actionLoading = ref(false)

async function archiveUser() {
  actionLoading.value = true
  const { error } = await supabase.from('profiles').update({
    archived_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', props.profile.id)
  actionLoading.value = false
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'User diarsipkan', color: 'success', duration: 2000 })
  emit('updated')
}

async function restoreUser() {
  actionLoading.value = true
  const { error } = await supabase.from('profiles').update({
    deleted_at: null,
    archived_at: null,
    updated_at: new Date().toISOString()
  }).eq('id', props.profile.id)
  actionLoading.value = false
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'User dipulihkan', color: 'success', duration: 2000 })
  emit('updated')
}

async function softDeleteUser() {
  actionLoading.value = true
  const { error } = await supabase.from('profiles').update({
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).eq('id', props.profile.id)
  actionLoading.value = false
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'User dihapus (soft)', color: 'success', duration: 2000 })
  emit('updated')
}

const banLoading = ref(false)

async function toggleBan() {
  const isBanned = !!authUser.value?.banned_until
  banLoading.value = true
  try {
    await $fetch(`/api/users/${props.profile.id}`, {
      method: 'PATCH',
      body: { action: isBanned ? 'unban' : 'ban' }
    })
    toast.add({ title: isBanned ? 'User di-unban' : 'User di-ban', color: 'success', duration: 2000 })
    await refreshAuth()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  } finally {
    banLoading.value = false
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '-'
  return format(new Date(d), 'dd MMM yyyy, HH:mm', { locale: localeId })
}

function fmtDateShort(d: string | null) {
  if (!d) return '-'
  return format(new Date(d), 'dd MMM yyyy', { locale: localeId })
}

const roleInfo = computed(() => Enum.UserRole.find(r => r.value === props.profile.role) ?? null)
const isBanned = computed(() => !!authUser.value?.banned_until)
const isDeleted = computed(() => !!props.profile.deleted_at)
const isArchived = computed(() => !isDeleted.value && !!props.profile.archived_at)
</script>

<template>
  <div class="space-y-5">
    <!-- Profile identity card -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <p class="font-semibold text-highlighted">
            Profil Pengguna
          </p>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-pencil"
              label="Edit Profil"
              size="sm"
              color="primary"
              variant="soft"
              @click="editOpen = true"
            />
            <UDropdownMenu
              :items="[
                isDeleted || isArchived
                  ? [{ label: 'Pulihkan Akun', icon: 'i-lucide-undo-2', onSelect: restoreUser }]
                  : [
                      { label: 'Arsipkan', icon: 'i-lucide-archive', onSelect: archiveUser },
                      { label: 'Hapus (Soft)', icon: 'i-lucide-user-x', color: 'error' as const, onSelect: softDeleteUser }
                    ],
                [{ label: isBanned ? 'Unban User' : 'Ban User', icon: isBanned ? 'i-lucide-shield-check' : 'i-lucide-ban', color: 'error' as const, onSelect: toggleBan }]
              ]"
            >
              <UButton
                icon="i-lucide-ellipsis-vertical"
                color="neutral"
                variant="ghost"
                size="sm"
                :loading="actionLoading || banLoading"
              />
            </UDropdownMenu>
          </div>
        </div>
      </template>

      <!-- Avatar + badges -->
      <div class="flex items-start gap-4 mb-5">
        <UAvatar
          :src="profile.avatar_url ?? undefined"
          :alt="profile.full_name ?? 'User'"
          size="xl"
        />
        <div class="flex-1 min-w-0">
          <p class="text-xl font-bold text-highlighted">
            {{ profile.full_name ?? '-' }}
          </p>
          <p class="text-sm text-muted mb-2">
            @{{ profile.username ?? '-' }}
          </p>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-if="roleInfo"
              :color="roleInfo.color as any"
              variant="soft"
              :leading-icon="roleInfo.icon"
              class="capitalize"
            >
              {{ roleInfo.label }}
            </UBadge>
            <UBadge v-if="profile.is_admin" color="info" variant="solid" leading-icon="i-lucide-shield-check">
              Admin
            </UBadge>
            <UBadge v-if="isDeleted" color="error" variant="soft">
              Dihapus
            </UBadge>
            <UBadge v-else-if="isArchived" color="warning" variant="soft">
              Diarsipkan
            </UBadge>
            <UBadge v-else color="success" variant="soft">
              Aktif
            </UBadge>
            <UBadge v-if="isBanned" color="error" variant="solid" leading-icon="i-lucide-ban">
              Banned
            </UBadge>
          </div>
        </div>
      </div>

      <!-- Profile fields grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div>
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Email
          </p>
          <p class="text-highlighted">
            {{ profile.email ?? authUser?.email ?? '-' }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Telepon
          </p>
          <p class="text-highlighted">
            {{ profile.phone ?? '-' }}
          </p>
        </div>
        <div class="sm:col-span-2">
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Bio
          </p>
          <p class="text-highlighted leading-relaxed">
            {{ profile.bio ?? '-' }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Alamat
          </p>
          <p class="text-highlighted">
            {{ profile.address ?? '-' }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Tanggal Lahir
          </p>
          <p class="text-highlighted">
            {{ fmtDateShort(profile.birth_date) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Website
          </p>
          <a
            v-if="profile.website"
            :href="profile.website"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline break-all"
          >
            {{ profile.website }}
          </a>
          <p v-else class="text-highlighted">
            -
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Terdaftar
          </p>
          <p class="text-highlighted">
            {{ fmtDateShort(profile.created_at) }}
          </p>
        </div>
        <div v-if="profile.deleted_at">
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Dihapus
          </p>
          <p class="text-error">
            {{ fmtDateShort(profile.deleted_at) }}
          </p>
        </div>
        <div v-if="profile.archived_at">
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Diarsipkan
          </p>
          <p class="text-warning">
            {{ fmtDateShort(profile.archived_at) }}
          </p>
        </div>
      </div>
    </UCard>

    <!-- Auth user info card -->
    <UCard v-if="authUser">
      <template #header>
        <p class="font-semibold text-highlighted">
          Informasi Auth
        </p>
      </template>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div>
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Auth ID
          </p>
          <p class="text-highlighted font-mono text-xs break-all">
            {{ authUser.id }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Email Terkonfirmasi
          </p>
          <p class="text-highlighted">
            {{ authUser.email_confirmed_at ? fmtDate(authUser.email_confirmed_at) : 'Belum dikonfirmasi' }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Login Terakhir
          </p>
          <p class="text-highlighted">
            {{ fmtDate(authUser.last_sign_in_at) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Status Ban
          </p>
          <p :class="isBanned ? 'text-error' : 'text-success'">
            {{ isBanned ? `Banned hingga ${fmtDate(authUser.banned_until)}` : 'Aktif' }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-0.5 uppercase font-medium">
            Provider Login
          </p>
          <div class="flex flex-wrap gap-1.5 mt-0.5">
            <UBadge
              v-for="identity in authUser.identities"
              :key="identity.provider"
              color="neutral"
              variant="soft"
              class="capitalize"
            >
              {{ identity.provider }}
            </UBadge>
            <span v-if="!authUser.identities?.length" class="text-muted">-</span>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Edit Modal -->
    <UsersEditModal
      v-model:open="editOpen"
      :user="profile"
      @saved="emit('updated')"
    />
  </div>
</template>
