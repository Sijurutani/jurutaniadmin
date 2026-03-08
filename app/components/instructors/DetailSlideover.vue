<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Database } from '~/types/database.types'

type InstructorRow = Database['public']['Tables']['instructors']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type InstructorWithProfile = InstructorRow & {
  profile: Pick<ProfileRow, 'id' | 'full_name' | 'username' | 'email' | 'avatar_url' | 'role' | 'phone' | 'bio' | 'address' | 'birth_date' | 'website'> | null
}

const props = defineProps<{ instructor: InstructorWithProfile | null }>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ edit: [instructor: InstructorWithProfile] }>()

function fmtDate(d: string | null) {
  if (!d) return '-'
  return format(new Date(d), 'dd MMM yyyy', { locale: localeId })
}

const roleInfo = computed(() => {
  const role = props.instructor?.profile?.role
  if (!role) return null
  return Enum.UserRole.find(r => r.value === role) ?? null
})
</script>

<template>
  <USlideover v-model:open="open" title="Detail Penyuluh" :ui="{ content: 'max-w-md' }">
    <template #body>
      <div v-if="instructor" class="space-y-6 py-2">
        <!-- Header -->
        <div class="flex flex-col items-center gap-3">
          <UAvatar
            :src="instructor.profile?.avatar_url ?? undefined"
            :alt="instructor.profile?.full_name ?? 'Penyuluh'"
            size="xl"
          />
          <div class="text-center">
            <p class="text-lg font-semibold text-highlighted">{{ instructor.profile?.full_name ?? '-' }}</p>
            <p class="text-sm text-muted">@{{ instructor.profile?.username ?? '-' }}</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap justify-center">
            <UBadge v-if="roleInfo" :color="roleInfo.color as any" variant="soft" :leading-icon="roleInfo.icon">
              {{ roleInfo.label }}
            </UBadge>
            <UBadge color="warning" variant="soft" leading-icon="i-lucide-book-open">Penyuluh</UBadge>
          </div>
        </div>

        <USeparator />

        <!-- Profile data -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Data Profil</p>
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div class="col-span-2">
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Email</p>
              <p class="text-highlighted break-all">{{ instructor.profile?.email ?? '-' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Telepon</p>
              <p class="text-highlighted">{{ instructor.profile?.phone ?? '-' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Tanggal Lahir</p>
              <p class="text-highlighted">{{ fmtDate(instructor.profile?.birth_date ?? null) }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Alamat</p>
              <p class="text-highlighted">{{ instructor.profile?.address ?? '-' }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Bio</p>
              <p class="text-highlighted leading-relaxed">{{ instructor.profile?.bio ?? '-' }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Website</p>
              <p class="text-highlighted break-all">{{ instructor.profile?.website ?? '-' }}</p>
            </div>
          </div>
        </div>

        <USeparator />

        <!-- Instructor data -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Data Penyuluh</p>
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">ID Penyuluh</p>
              <p class="text-highlighted font-mono text-xs">#{{ instructor.id }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Terdaftar</p>
              <p class="text-highlighted">{{ fmtDate(instructor.created_at) }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Provinsi</p>
              <p class="text-highlighted">{{ instructor.provinces ?? '-' }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Kabupaten/Kota</p>
              <p class="text-highlighted">{{ instructor.district ?? '-' }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Catatan</p>
              <p class="text-highlighted leading-relaxed">{{ instructor.note ?? '-' }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col items-center justify-center h-40 gap-3 text-center">
        <UIcon name="i-lucide-book-open" class="size-10 text-muted" />
        <p class="text-muted text-sm">Pilih penyuluh untuk melihat detailnya</p>
      </div>
    </template>

    <template v-if="instructor" #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Tutup" color="neutral" variant="subtle" @click="open = false" />
        <UButton label="Edit" icon="i-lucide-pencil" color="primary" @click="emit('edit', instructor!)" />
      </div>
    </template>
  </USlideover>
</template>
