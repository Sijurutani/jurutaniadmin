<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type ExpertRow = Database['public']['Tables']['experts']['Row']
type CategoryExpert = Database['public']['Tables']['category_expert']['Row']

const props = defineProps<{ userId: string }>()

const supabase = useSupabase()
const toast = useToast()

// ─── Data ─────────────────────────────────────────────────────────────────────
const { data: expert, refresh } = await useAsyncData(`expert-${props.userId}`, async () => {
  const { data } = await supabase
    .from('experts')
    .select('*')
    .eq('user_id', props.userId)
    .is('deleted_at', null)
    .maybeSingle()
  return data as ExpertRow | null
}, { default: () => null })

const { data: categories } = await useAsyncData('expert-categories', async () => {
  const { data } = await supabase.from('category_expert').select('*').is('deleted_at', null).order('name')
  return (data ?? []) as CategoryExpert[]
}, { default: () => [] as CategoryExpert[] })

// ─── Form ─────────────────────────────────────────────────────────────────────
const formOpen = ref(false)
const formLoading = ref(false)
const deleteLoading = ref(false)

const schema = z.object({
  category: z.string().optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal(''))
})
type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({ category: '', note: '' })

function openForm() {
  state.category = expert.value?.category ?? ''
  state.note = expert.value?.note ?? ''
  formOpen.value = true
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  formLoading.value = true
  try {
    if (expert.value) {
      const { error } = await supabase.from('experts').update({
        category: event.data.category || null,
        note: event.data.note || null,
        updated_at: new Date().toISOString()
      }).eq('id', expert.value.id)
      if (error) throw error
      toast.add({ title: 'Data pakar diperbarui', color: 'success', duration: 2000 })
    } else {
      const { error } = await supabase.from('experts').insert({
        user_id: props.userId,
        category: event.data.category || null,
        note: event.data.note || null
      })
      if (error) throw error
      toast.add({ title: 'User didaftarkan sebagai Pakar', color: 'success', duration: 2000 })
    }
    formOpen.value = false
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err.message, color: 'error' })
  } finally {
    formLoading.value = false
  }
}

async function deleteExpert() {
  if (!expert.value) return
  deleteLoading.value = true
  const { error } = await supabase.from('experts').update({
    deleted_at: new Date().toISOString()
  }).eq('id', expert.value.id)
  deleteLoading.value = false
  if (error) { toast.add({ title: 'Error', description: error.message, color: 'error' }); return }
  toast.add({ title: 'Data pakar dihapus', color: 'success', duration: 2000 })
  await refresh()
}

const categoryOptions = computed(() =>
  (categories.value ?? []).map(c => ({ label: c.name, value: c.value }))
)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <p class="font-semibold text-highlighted">
            Data Pakar
          </p>
          <p class="text-xs text-muted mt-0.5">
            Registrasi pengguna sebagai pakar pertanian
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            v-if="!expert"
            icon="i-lucide-user-plus"
            label="Daftarkan sebagai Pakar"
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
              @click="deleteExpert"
            />
          </template>
        </div>
      </div>
    </template>

    <!-- No expert state -->
    <div v-if="!expert && !formOpen" class="flex flex-col items-center justify-center py-8 gap-3 text-center">
      <div class="size-12 rounded-full bg-muted/50 flex items-center justify-center">
        <UIcon name="i-lucide-brain" class="size-6 text-muted" />
      </div>
      <div>
        <p class="font-medium text-highlighted">
          Belum Terdaftar Sebagai Pakar
        </p>
        <p class="text-sm text-muted mt-0.5">
          Klik tombol di atas untuk mendaftarkan pengguna ini sebagai pakar
        </p>
      </div>
    </div>

    <!-- Expert data -->
    <div v-else-if="expert && !formOpen" class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
      <div>
        <p class="text-xs text-muted mb-0.5 uppercase font-medium">
          ID Pakar
        </p>
        <p class="text-highlighted font-mono text-xs">
          #{{ expert.id }}
        </p>
      </div>
      <div>
        <p class="text-xs text-muted mb-0.5 uppercase font-medium">
          Kategori
        </p>
        <UBadge v-if="expert.category" color="success" variant="soft">
          {{ (categories ?? []).find(c => c.value === expert!.category)?.name ?? expert.category }}
        </UBadge>
        <span v-else class="text-muted">-</span>
      </div>
      <div class="sm:col-span-2">
        <p class="text-xs text-muted mb-0.5 uppercase font-medium">
          Catatan
        </p>
        <p class="text-highlighted leading-relaxed">
          {{ expert.note ?? '-' }}
        </p>
      </div>
    </div>

    <!-- Form (create/edit) -->
    <UForm v-if="formOpen" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
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
      <div class="flex justify-end gap-2">
        <UButton label="Batal" color="neutral" variant="subtle" @click="formOpen = false" />
        <UButton :label="expert ? 'Simpan' : 'Daftarkan'" color="primary" type="submit" :loading="formLoading" />
      </div>
    </UForm>
  </UCard>
</template>
