<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type ExpertRow = Database['public']['Tables']['experts']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type CategoryExpert = Database['public']['Tables']['category_expert']['Row']
type ExpertWithProfile = ExpertRow & {
  profile: Pick<ProfileRow, 'id' | 'full_name' | 'username' | 'email' | 'avatar_url' | 'role' | 'phone' | 'bio' | 'address' | 'birth_date' | 'website'> | null
}

const props = defineProps<{
  expert: ExpertWithProfile | null
  categories: CategoryExpert[]
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [] }>()

const supabase = useSupabaseClient()
const toast = useToast()

const schema = z.object({
  full_name: z.string().min(1, 'Nama tidak boleh kosong').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal(''))
})
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  full_name: '', phone: '', address: '', bio: '', category: '', note: ''
})

watch([() => props.expert, open], ([expert, isOpen]) => {
  if (isOpen && expert) {
    state.full_name = expert.profile?.full_name ?? ''
    state.phone = expert.profile?.phone ?? ''
    state.address = expert.profile?.address ?? ''
    state.bio = expert.profile?.bio ?? ''
    state.category = expert.category ?? ''
    state.note = expert.note ?? ''
  }
}, { immediate: true })

const formLoading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.expert) return
  formLoading.value = true
  try {
    const [profileRes, expertRes] = await Promise.all([
      supabase.from('profiles').update({
        full_name: event.data.full_name,
        phone: event.data.phone || null,
        address: event.data.address || null,
        bio: event.data.bio || null,
        updated_at: new Date().toISOString()
      }).eq('id', props.expert.user_id),
      supabase.from('experts').update({
        category: event.data.category || null,
        note: event.data.note || null,
        updated_at: new Date().toISOString()
      }).eq('id', props.expert.id)
    ])
    if (profileRes.error) throw profileRes.error
    if (expertRes.error) throw expertRes.error
    toast.add({ title: 'Data pakar diperbarui', color: 'success', duration: 2000 })
    open.value = false
    emit('saved')
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err.message, color: 'error' })
  } finally {
    formLoading.value = false
  }
}

const categoryOptions = computed(() =>
  (props.categories ?? []).map(c => ({ label: c.name, value: c.value }))
)
</script>

<template>
  <UModal v-model:open="open" title="Edit Pakar" :ui="{ content: 'max-w-lg' }">
    <template #body>
      <UForm v-if="expert" :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
        <!-- Profile section -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Data Profil</p>
          <div class="space-y-3">
            <UFormField label="Nama Lengkap" name="full_name">
              <UInput v-model="state.full_name" placeholder="Nama lengkap..." class="w-full" />
            </UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Telepon" name="phone">
                <UInput v-model="state.phone" placeholder="+62..." class="w-full" />
              </UFormField>
              <UFormField label="Alamat" name="address">
                <UInput v-model="state.address" placeholder="Alamat..." class="w-full" />
              </UFormField>
            </div>
            <UFormField label="Bio" name="bio">
              <UTextarea v-model="state.bio" placeholder="Bio singkat..." :rows="2" class="w-full" />
            </UFormField>
          </div>
        </div>

        <USeparator />

        <!-- Expert section -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Data Pakar</p>
          <div class="space-y-3">
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
              <UTextarea v-model="state.note" placeholder="Catatan..." :rows="3" class="w-full" />
            </UFormField>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <UButton label="Batal" color="neutral" variant="subtle" @click="open = false" />
          <UButton label="Simpan" icon="i-lucide-save" color="primary" type="submit" :loading="formLoading" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
