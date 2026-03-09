<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { Database } from '~/types/database.types'

type ExpertRow = Database['public']['Tables']['experts']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type CategoryExpert = Database['public']['Tables']['category_expert']['Row']
export type ExpertWithProfile = ExpertRow & {
  profile: Partial<ProfileRow> | null
}

const props = defineProps<{
  expert: ExpertWithProfile | null
  categories: CategoryExpert[]
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ edit: [expert: ExpertWithProfile] }>()

const supabase = useSupabaseClient()

// Fetch profil lengkap saat slideover dibuka
const fullProfile = ref<Partial<ProfileRow> | null>(null)
const loadingProfile = ref(false)

watch(open, async (isOpen) => {
  if (!isOpen || !props.expert?.user_id) {
    fullProfile.value = null
    return
  }
  loadingProfile.value = true
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, username, email, avatar_url, role, phone, bio, address, birth_date, website')
    .eq('id', props.expert.user_id)
    .single()
  fullProfile.value = data
  loadingProfile.value = false
})

// Gunakan fullProfile jika ada, fallback ke props.expert.profile
const profile = computed(() => fullProfile.value ?? props.expert?.profile ?? null)

function fmtDate(d: string | null | undefined) {
  if (!d) return '-'
  return format(new Date(d), 'dd MMM yyyy', { locale: localeId })
}

const roleInfo = computed(() => {
  const role = profile.value?.role
  if (!role) return null
  return Enum.UserRole.find(r => r.value === role) ?? null
})

const categoryLabel = computed(() => {
  if (!props.expert?.category) return null
  return props.categories.find(c => c.value === props.expert!.category)?.name ?? props.expert.category
})
</script>

<template>
  <USlideover v-model:open="open" title="Detail Pakar" :ui="{ content: 'max-w-md' }">
    <template #body>
      <div v-if="expert" class="space-y-6 py-2">
        <!-- Header -->
        <div class="flex flex-col items-center gap-3">
          <UAvatar
            :src="expert.profile?.avatar_url ?? undefined"
            :alt="expert.profile?.full_name ?? 'Pakar'"
            size="xl"
          />
          <div class="text-center">
            <p class="text-lg font-semibold text-highlighted">{{ profile?.full_name ?? '-' }}</p>
            <p class="text-sm text-muted">@{{ profile?.username ?? '-' }}</p>
          </div>
          <div class="flex items-center gap-2 flex-wrap justify-center">
            <UBadge v-if="roleInfo" :color="roleInfo.color as any" variant="soft" :leading-icon="roleInfo.icon">
              {{ roleInfo.label }}
            </UBadge>
            <UBadge color="success" variant="soft" leading-icon="i-lucide-brain">Pakar</UBadge>
          </div>
        </div>

        <USeparator />

        <!-- Profile data -->
        <div>
          <div v-if="loadingProfile" class="flex justify-center py-6">
            <UIcon name="i-lucide-loader-circle" class="size-5 text-muted animate-spin" />
          </div>
          <template v-else>
            <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Data Profil</p>
            <div class="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div class="col-span-2">
                <p class="text-xs text-muted mb-0.5 uppercase font-medium">Email</p>
                <p class="text-highlighted break-all">{{ profile?.email ?? '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-muted mb-0.5 uppercase font-medium">Telepon</p>
                <p class="text-highlighted">{{ profile?.phone ?? '-' }}</p>
              </div>
              <div>
                <p class="text-xs text-muted mb-0.5 uppercase font-medium">Tanggal Lahir</p>
                <p class="text-highlighted">{{ fmtDate(profile?.birth_date) }}</p>
              </div>
              <div class="col-span-2">
                <p class="text-xs text-muted mb-0.5 uppercase font-medium">Alamat</p>
                <p class="text-highlighted">{{ profile?.address ?? '-' }}</p>
              </div>
              <div class="col-span-2">
                <p class="text-xs text-muted mb-0.5 uppercase font-medium">Bio</p>
                <p class="text-highlighted leading-relaxed">{{ profile?.bio ?? '-' }}</p>
              </div>
              <div class="col-span-2">
                <p class="text-xs text-muted mb-0.5 uppercase font-medium">Website</p>
                <p class="text-highlighted break-all">{{ profile?.website ?? '-' }}</p>
              </div>
            </div>
          </template>
        </div>

        <USeparator />

        <!-- Expert data -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Data Pakar</p>
          <div class="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">ID Pakar</p>
              <p class="text-highlighted font-mono text-xs">#{{ expert.id }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Kategori</p>
              <UBadge v-if="categoryLabel" color="success" variant="soft">{{ categoryLabel }}</UBadge>
              <span v-else class="text-muted">-</span>
            </div>
            <div>
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Terdaftar</p>
              <p class="text-highlighted">{{ fmtDate(expert.created_at) }}</p>
            </div>
            <div>
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Diperbarui</p>
              <p class="text-highlighted">{{ fmtDate(expert.updated_at) }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-xs text-muted mb-0.5 uppercase font-medium">Catatan</p>
              <p class="text-highlighted leading-relaxed">{{ expert.note ?? '-' }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col items-center justify-center h-40 gap-3 text-center">
        <UIcon name="i-lucide-brain" class="size-10 text-muted" />
        <p class="text-muted text-sm">Pilih pakar untuk melihat detailnya</p>
      </div>
    </template>

    <template v-if="expert" #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Tutup" color="neutral" variant="subtle" @click="open = false" />
        <UButton label="Edit" icon="i-lucide-pencil" color="primary" @click="emit('edit', expert!)" />
      </div>
    </template>
  </USlideover>
</template>
