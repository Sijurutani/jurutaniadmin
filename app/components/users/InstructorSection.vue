<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type InstructorRow = Database['public']['Tables']['instructors']['Row']

const props = defineProps<{ userId: string }>()

const supabase = useSupabaseClient()
const toast = useToast()

// ─── Data ─────────────────────────────────────────────────────────────────────
const { data: instructor, refresh } = await useAsyncData(`instructor-${props.userId}`, async () => {
  const { data } = await supabase
    .from('instructors')
    .select('*')
    .eq('user_id', props.userId)
    .is('deleted_at', null)
    .maybeSingle()
  return data as InstructorRow | null
}, { default: () => null })

// ─── Form ─────────────────────────────────────────────────────────────────────
const formOpen = ref(false)
const formLoading = ref(false)
const deleteLoading = ref(false)

const schema = z.object({
  provinces: z.string().max(100).optional().or(z.literal('')),
  district: z.string().max(100).optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal(''))
})
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ provinces: '', district: '', note: '' })

function openForm() {
  state.provinces = instructor.value?.provinces ?? ''
  state.district = instructor.value?.district ?? ''
  state.note = instructor.value?.note ?? ''
  formOpen.value = true
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  formLoading.value = true
  try {
    if (instructor.value) {
      const { error } = await supabase.from('instructors').update({
        provinces: event.data.provinces || null,
        district: event.data.district || null,
        note: event.data.note || null,
        updated_at: new Date().toISOString()
      }).eq('id', instructor.value.id)
      if (error) throw error
      toast.add({ title: 'Data penyuluh diperbarui', color: 'success', duration: 2000 })
    } else {
      const { error } = await supabase.from('instructors').insert({
        user_id: props.userId,
        provinces: event.data.provinces || null,
        district: event.data.district || null,
        note: event.data.note || null
      })
      if (error) throw error
      toast.add({ title: 'User didaftarkan sebagai Penyuluh', color: 'success', duration: 2000 })
    }
    formOpen.value = false
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err.message, color: 'error' })
  } finally {
    formLoading.value = false
  }
}

async function deleteInstructor() {
  if (!instructor.value) return
  deleteLoading.value = true
  const { error } = await supabase.from('instructors').update({
    deleted_at: new Date().toISOString()
  }).eq('id', instructor.value.id)
  deleteLoading.value = false
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'Data penyuluh dihapus', color: 'success', duration: 2000 })
  await refresh()
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <p class="font-semibold text-highlighted">
            Data Penyuluh
          </p>
          <p class="text-xs text-muted mt-0.5">
            Registrasi pengguna sebagai penyuluh pertanian
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            v-if="!instructor"
            icon="i-lucide-user-plus"
            label="Daftarkan sebagai Penyuluh"
            size="sm"
            @click="openForm"
          />
          <template v-else>
            <UButton icon="i-lucide-pencil" label="Edit" size="sm" color="neutral" variant="soft" @click="openForm" />
            <UButton
              icon="i-lucide-trash-2"
              size="sm"
              color="error"
              variant="soft"
              :loading="deleteLoading"
              @click="deleteInstructor"
            />
          </template>
        </div>
      </div>
    </template>

    <!-- No instructor state -->
    <div v-if="!instructor && !formOpen" class="flex flex-col items-center justify-center py-8 gap-3 text-center">
      <div class="size-12 rounded-full bg-muted/50 flex items-center justify-center">
        <UIcon name="i-lucide-book-open" class="size-6 text-muted" />
      </div>
      <div>
        <p class="font-medium text-highlighted">
          Belum Terdaftar Sebagai Penyuluh
        </p>
        <p class="text-sm text-muted mt-0.5">
          Klik tombol di atas untuk mendaftarkan pengguna ini sebagai penyuluh
        </p>
      </div>
    </div>

    <!-- Instructor data -->
    <div v-else-if="instructor && !formOpen" class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
      <div>
        <p class="text-xs text-muted mb-0.5 uppercase font-medium">
          ID Penyuluh
        </p>
        <p class="text-highlighted font-mono text-xs">
          #{{ instructor.id }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted mb-0.5 uppercase font-medium">
          Provinsi
        </p>
        <p class="text-highlighted">
          {{ instructor.provinces ?? '-' }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted mb-0.5 uppercase font-medium">
          Kabupaten/Kota
        </p>
        <p class="text-highlighted">
          {{ instructor.district ?? '-' }}
        </p>
      </div>
      <div class="sm:col-span-2">
        <p class="text-xs text-muted mb-0.5 uppercase font-medium">
          Catatan
        </p>
        <p class="text-highlighted leading-relaxed">
          {{ instructor.note ?? '-' }}
        </p>
      </div>
    </div>

    <!-- Form -->
    <UForm v-if="formOpen" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Provinsi" name="provinces">
          <UInput v-model="state.provinces" placeholder="Jawa Barat..." class="w-full" />
        </UFormField>
        <UFormField label="Kabupaten/Kota" name="district">
          <UInput v-model="state.district" placeholder="Bandung..." class="w-full" />
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
      <div class="flex justify-end gap-2">
        <UButton label="Batal" color="neutral" variant="subtle" @click="formOpen = false" />
        <UButton :label="instructor ? 'Simpan' : 'Daftarkan'" color="primary" type="submit" :loading="formLoading" />
      </div>
    </UForm>
  </UCard>
</template>
