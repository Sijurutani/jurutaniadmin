<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type InstructorRow = Database['public']['Tables']['instructors']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type InstructorWithProfile = InstructorRow & {
  profile: Pick<ProfileRow, 'id' | 'full_name' | 'username' | 'email' | 'avatar_url' | 'role' | 'phone' | 'bio' | 'address' | 'birth_date' | 'website'> | null
}

const props = defineProps<{ instructor: InstructorWithProfile | null }>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [] }>()

const supabase = useSupabase()
const toast = useToast()

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

const schema = z.object({
  full_name: z.string().min(1, 'Nama tidak boleh kosong').max(100),
  phone: z.string().max(20).optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
  provinces: z.string().max(100).optional().or(z.literal('')),
  district: z.string().max(100).optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal(''))
})
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  full_name: '', phone: '', address: '', bio: '', provinces: '', district: '', note: ''
})

const isFormInit = ref(false)
watch([() => props.instructor, open], async ([inst, isOpen]) => {
  if (isOpen && inst) {
    isFormInit.value = true
    state.full_name = inst.profile?.full_name ?? ''
    state.phone = inst.profile?.phone ?? ''
    state.address = inst.profile?.address ?? ''
    state.bio = inst.profile?.bio ?? ''
    state.provinces = inst.provinces ?? ''
    state.district = inst.district ?? ''
    state.note = inst.note ?? ''
    await nextTick()
    isFormInit.value = false
  }
}, { immediate: true })

// Reset district when province changes (but not during initial form load)
watch(() => state.provinces, () => {
  if (!isFormInit.value) state.district = ''
})

const formLoading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.instructor) return
  formLoading.value = true
  try {
    const [profileRes, instructorRes] = await Promise.all([
      supabase.from('profiles').update({
        full_name: event.data.full_name,
        phone: event.data.phone || null,
        address: event.data.address || null,
        bio: event.data.bio || null,
        updated_at: new Date().toISOString()
      }).eq('id', props.instructor.user_id),
      supabase.from('instructors').update({
        provinces: event.data.provinces || null,
        district: event.data.district || null,
        note: event.data.note || null,
        updated_at: new Date().toISOString()
      }).eq('id', props.instructor.id)
    ])
    if (profileRes.error) throw profileRes.error
    if (instructorRes.error) throw instructorRes.error
    toast.add({ title: 'Data penyuluh diperbarui', color: 'success', duration: 2000 })
    open.value = false
    emit('saved')
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err.message, color: 'error' })
  } finally {
    formLoading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Edit Penyuluh" :ui="{ content: 'max-w-lg' }">
    <template #body>
      <UForm v-if="instructor" :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
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

        <!-- Instructor section -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Data Penyuluh</p>
          <div class="space-y-3">
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
