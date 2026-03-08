<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const supabase = useSupabase()
const toast = useToast()

// ─── User search ──────────────────────────────────────────────────────────────
const userSearch = ref('')
const searchResults = ref<ProfileRow[]>([])
const searchLoading = ref(false)
const selectedUser = ref<ProfileRow | null>(null)

watchDebounced(userSearch, async (q) => {
  if (!q || q.length < 2) { searchResults.value = []; return }
  searchLoading.value = true
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .is('deleted_at', null)
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,username.ilike.%${q}%`)
    .limit(10)
  searchResults.value = (data ?? []) as ProfileRow[]
  searchLoading.value = false
}, { debounce: 300 })

function selectUser(user: ProfileRow) {
  selectedUser.value = user
  userSearch.value = ''
  searchResults.value = []
}

function clearUser() { selectedUser.value = null }

// ─── Form ─────────────────────────────────────────────────────────────────────
const schema = z.object({
  provinces: z.string().max(100).optional().or(z.literal('')),
  district: z.string().max(100).optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal(''))
})
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ provinces: '', district: '', note: '' })

// ─── Districts ─────────────────────────────────────────────────────────────────
type DistrictRow = { id: number, name: string, province: string }
const { data: allDistricts } = useAsyncData('all-districts', async () => {
  const { data } = await supabase.from('districts').select('id, name, province').order('province').order('name')
  return (data ?? []) as DistrictRow[]
}, { default: () => [] as DistrictRow[] })

const provinceOptions = computed(() =>
  [...new Set((allDistricts.value ?? []).map(d => d.province))].sort().map(p => ({ label: p, value: p }))
)
const districtOptions = computed(() =>
  (allDistricts.value ?? []).filter(d => d.province === state.provinces).map(d => ({ label: d.name, value: d.name }))
)

// Reset district when province changes
watch(() => state.provinces, () => { state.district = '' })
const formLoading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!selectedUser.value) {
    toast.add({ title: 'Pilih user terlebih dahulu', color: 'warning' })
    return
  }
  formLoading.value = true
  try {
    const { data: existing } = await supabase
      .from('instructors')
      .select('id')
      .eq('user_id', selectedUser.value.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (existing) {
      toast.add({ title: 'User sudah terdaftar sebagai penyuluh', color: 'warning' })
      return
    }
    const { error } = await supabase.from('instructors').insert({
      user_id: selectedUser.value.id,
      provinces: event.data.provinces || null,
      district: event.data.district || null,
      note: event.data.note || null
    })
    if (error) throw error
    toast.add({ title: 'Penyuluh berhasil ditambahkan', color: 'success', duration: 2000 })
    open.value = false
    emit('saved')
    resetForm()
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err.message, color: 'error' })
  } finally {
    formLoading.value = false
  }
}

function resetForm() {
  selectedUser.value = null
  userSearch.value = ''
  state.provinces = ''
  state.district = ''
  state.note = ''
}

watch(open, (v) => { if (!v) resetForm() })

const roleInfo = (role: string | null) => Enum.UserRole.find(r => r.value === role)
</script>

<template>
  <UModal
    v-model:open="open"
    title="Tambah Penyuluh"
    description="Cari user terdaftar dan daftarkan sebagai penyuluh"
    :ui="{ content: 'max-w-lg' }"
  >
    <template #body>
      <div class="space-y-5">
        <!-- User search -->
        <div>
          <label class="block text-sm font-medium text-highlighted mb-1.5">Pilih User</label>

          <!-- Selected -->
          <div v-if="selectedUser" class="flex items-center gap-3 p-3 rounded-lg border border-default bg-elevated">
            <UAvatar :src="selectedUser.avatar_url ?? undefined" :alt="selectedUser.full_name ?? 'User'" size="sm" />
            <div class="flex-1 min-w-0">
              <p class="font-medium text-highlighted text-sm truncate">{{ selectedUser.full_name ?? selectedUser.username ?? '—' }}</p>
              <p class="text-xs text-muted truncate">{{ selectedUser.email ?? '—' }}</p>
            </div>
            <UBadge
              v-if="selectedUser.role"
              :color="(roleInfo(selectedUser.role)?.color as any) ?? 'neutral'"
              variant="soft"
              size="sm"
            >
              {{ roleInfo(selectedUser.role)?.label ?? selectedUser.role }}
            </UBadge>
            <UButton icon="i-lucide-x" size="xs" color="neutral" variant="ghost" @click="clearUser" />
          </div>

          <!-- Search -->
          <div v-else class="relative">
            <UInput
              v-model="userSearch"
              icon="i-lucide-search"
              placeholder="Cari nama, email, atau username..."
              class="w-full"
              :loading="searchLoading"
            />
            <div
              v-if="searchResults.length > 0"
              class="absolute z-50 w-full mt-1 bg-default border border-default rounded-lg shadow-lg overflow-hidden"
            >
              <button
                v-for="user in searchResults"
                :key="user.id"
                class="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-elevated transition-colors text-left"
                @click="selectUser(user)"
              >
                <UAvatar :src="user.avatar_url ?? undefined" :alt="user.full_name ?? 'User'" size="xs" />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-highlighted truncate">{{ user.full_name ?? user.username ?? '—' }}</p>
                  <p class="text-xs text-muted truncate">{{ user.email ?? '—' }}</p>
                </div>
                <UBadge
                  v-if="user.role"
                  :color="(roleInfo(user.role)?.color as any) ?? 'neutral'"
                  variant="soft"
                  size="xs"
                >
                  {{ roleInfo(user.role)?.label ?? user.role }}
                </UBadge>
              </button>
            </div>
            <p v-else-if="userSearch.length >= 2 && !searchLoading" class="mt-1 text-xs text-muted px-1">
              Tidak ada hasil ditemukan.
            </p>
          </div>
        </div>

        <USeparator />

        <!-- Instructor fields -->
        <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Provinsi" name="provinces">
              <USelectMenu
                v-model="state.provinces"
                :items="provinceOptions"
                placeholder="Pilih provinsi..."
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Kabupaten/Kota" name="district">
              <USelectMenu
                v-model="state.district"
                :items="districtOptions"
                placeholder="Pilih kabupaten/kota..."
                value-key="value"
                class="w-full"
                :disabled="!state.provinces"
              />
            </UFormField>
          </div>
          <UFormField label="Catatan" name="note">
            <UTextarea
              v-model="state.note"
              placeholder="Catatan tentang penyuluh ini..."
              :rows="3"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2 pt-1">
            <UButton label="Batal" color="neutral" variant="subtle" @click="open = false" />
            <UButton
              label="Daftarkan"
              icon="i-lucide-user-plus"
              color="primary"
              type="submit"
              :loading="formLoading"
              :disabled="!selectedUser"
            />
          </div>
        </UForm>
      </div>
    </template>
  </UModal>
</template>
