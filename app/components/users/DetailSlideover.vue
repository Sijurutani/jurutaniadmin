<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Database } from '~/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

const props = defineProps<{
  user: ProfileRow | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ edit: [user: ProfileRow] }>()

const roleInfo = computed(() => {
  if (!props.user?.role) return null
  return Enum.UserRole.find(r => r.value === props.user!.role) ?? null
})

function fmtDate(d: string | null) {
  if (!d) return '-'
  return format(new Date(d), 'dd MMM yyyy', { locale: localeId })
}
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Detail User"
    :ui="{ content: 'max-w-md' }"
  >
    <template #body>
      <div v-if="user" class="space-y-6">
        <!-- Avatar & identity -->
        <div class="flex flex-col items-center gap-3 pt-2">
          <UAvatar
            :src="user.avatar_url ?? undefined"
            :alt="user.full_name ?? user.username ?? 'User'"
            size="xl"
          />
          <div class="text-center">
            <p class="text-lg font-semibold text-highlighted">
              {{ user.full_name ?? '-' }}
            </p>
            <p class="text-sm text-muted">
              @{{ user.username ?? '-' }}
            </p>
          </div>

          <!-- Role & admin badges -->
          <div class="flex items-center gap-2 flex-wrap justify-center">
            <UBadge
              v-if="roleInfo"
              :color="roleInfo.color as any"
              variant="soft"
              :leading-icon="roleInfo.icon"
              class="capitalize"
            >
              {{ roleInfo.label }}
            </UBadge>
            <UBadge
              v-if="user.is_admin"
              color="info"
              variant="solid"
              leading-icon="i-lucide-shield-check"
            >
              Admin
            </UBadge>
            <UBadge
              v-if="user.deleted_at"
              color="error"
              variant="soft"
              leading-icon="i-lucide-user-x"
            >
              Dihapus
            </UBadge>
            <UBadge
              v-else-if="user.archived_at"
              color="warning"
              variant="soft"
              leading-icon="i-lucide-archive"
            >
              Diarsipkan
            </UBadge>
          </div>
        </div>

        <USeparator />

        <!-- Contact info -->
        <div class="space-y-3">
          <p class="text-xs font-semibold text-muted uppercase tracking-wider">
            Kontak
          </p>
          <div class="space-y-2">
            <div class="flex items-center gap-3 text-sm">
              <UIcon name="i-lucide-mail" class="size-4 text-muted shrink-0" />
              <span class="text-highlighted break-all">{{ user.email ?? '-' }}</span>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <UIcon name="i-lucide-phone" class="size-4 text-muted shrink-0" />
              <span class="text-highlighted">{{ user.phone ?? '-' }}</span>
            </div>
            <div v-if="user.website" class="flex items-center gap-3 text-sm">
              <UIcon name="i-lucide-globe" class="size-4 text-muted shrink-0" />
              <a
                :href="user.website"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary hover:underline break-all"
              >
                {{ user.website }}
              </a>
            </div>
          </div>
        </div>

        <USeparator />

        <!-- Personal info -->
        <div class="space-y-3">
          <p class="text-xs font-semibold text-muted uppercase tracking-wider">
            Info Pribadi
          </p>
          <div class="space-y-2">
            <div v-if="user.bio" class="text-sm text-highlighted leading-relaxed">
              {{ user.bio }}
            </div>
            <div class="flex items-center gap-3 text-sm">
              <UIcon name="i-lucide-map-pin" class="size-4 text-muted shrink-0" />
              <span class="text-highlighted">{{ user.address ?? '-' }}</span>
            </div>
            <div class="flex items-center gap-3 text-sm">
              <UIcon name="i-lucide-cake" class="size-4 text-muted shrink-0" />
              <span class="text-highlighted">{{ fmtDate(user.birth_date) }}</span>
            </div>
          </div>
        </div>

        <USeparator />

        <!-- System info -->
        <div class="space-y-3">
          <p class="text-xs font-semibold text-muted uppercase tracking-wider">
            Sistem
          </p>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">User ID</span>
              <span class="font-mono text-xs text-highlighted truncate max-w-48">{{ user.id }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Terdaftar</span>
              <span class="text-highlighted">{{ fmtDate(user.created_at) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Diperbarui</span>
              <span class="text-highlighted">{{ fmtDate(user.updated_at) }}</span>
            </div>
            <div v-if="user.deleted_at" class="flex justify-between">
              <span class="text-muted">Dihapus</span>
              <span class="text-error">{{ fmtDate(user.deleted_at) }}</span>
            </div>
            <div v-if="user.archived_at" class="flex justify-between">
              <span class="text-muted">Diarsipkan</span>
              <span class="text-warning">{{ fmtDate(user.archived_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div v-if="user" class="flex justify-between w-full gap-2">
        <UButton
          label="Tutup"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <div class="flex gap-2">
          <UButton
            :to="`/users/${user.id}`"
            label="Buka Halaman"
            icon="i-lucide-external-link"
            color="neutral"
            variant="outline"
            @click="open = false"
          />
          <UButton
            label="Edit User"
            icon="i-lucide-pencil"
            color="primary"
            @click="() => { emit('edit', user!); open = false }"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>
