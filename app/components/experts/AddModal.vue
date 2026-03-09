<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']
type CategoryExpert = Database['public']['Tables']['category_expert']['Row']

const emit = defineEmits<{ saved: [] }>()
const open = defineModel<boolean>('open', { default: false })

const supabase = useSupabaseClient()
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

// ─── Categories ───────────────────────────────────────────────────────────────
const { data: categories } = await useAsyncData('expert-categories-add', async () => {
  const { data } = await supabase.from('category_expert').select('*').is('deleted_at', null).order('name')
  return (data ?? []) as CategoryExpert[]
}, { default: () => [] as CategoryExpert[] })

// ─── Form ─────────────────────────────────────────────────────────────────────
const schema = z.object({
  category: z.string().optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal(''))
})
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ category: '', note: '' })
const formLoading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!selectedUser.value) {
    toast.add({ title: 'Pilih user terlebih dahulu', color: 'warning' })
    return
  }
  formLoading.value = true
  try {
    const { data: existing } = await supabase
      .from('experts')
      .select('id')
      .eq('user_id', selectedUser.value.id)
      .is('deleted_at', null)
      .maybeSingle()
    if (existing) {
      toast.add({ title: 'User sudah terdaftar sebagai pakar', color: 'warning' })
      return
    }
    const { error } = await supabase.from('experts').insert({
      user_id: selectedUser.value.id,
      category: event.data.category || null,
      note: event.data.note || null
    })
    if (error) throw error
    toast.add({ title: 'Pakar berhasil ditambahkan', color: 'success', duration: 2000 })
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
  state.category = ''
  state.note = ''
}

watch(open, (v) => { if (!v) resetForm() })

const categoryOptions = computed(() =>
  (categories.value ?? []).map(c => ({ label: c.name, value: c.value }))
)

const roleInfo = (role: string | null) => Enum.UserRole.find(r => r.value === role)
</script>

<template>
  <UModal
    v-model:open="open"
    title="Tambah Pakar"
    description="Cari user terdaftar dan daftarkan sebagai pakar"
    :ui="{ content: 'max-w-lg' }"
  >
    <template #body>
      <div class="space-y-5">
        <!-- User search -->
        <div>
          <label class="block text-sm font-medium text-highlighted mb-1.5">Pilih User</label>

          <!-- Selected user card -->
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

          <!-- Search input + dropdown -->
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

        <!-- Expert fields -->
        <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
          <UFormField label="Kategori" name="category">
            <USelect
              v-model="state.category"
              :items="categoryOptions"
              value-key="value"
              label-key="label"
              placeholder="Pilih kategori..."
              class="w-full"
            />
          </UFormField>
          <UFormField label="Catatan" name="note">
            <UTextarea
              v-model="state.note"
              placeholder="Catatan tentang pakar ini..."
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
