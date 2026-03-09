<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type VideoRow = Database['public']['Tables']['videos']['Row']

const props = defineProps<{
  video?: VideoRow | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [] }>()

const supabase = useSupabaseClient()
const toast = useToast()

const isEdit = computed(() => !!props.video)

const schema = z.object({
  title: z.string().min(3, 'Minimal 3 karakter'),
  description: z.string().optional(),
  link_yt: z.string()
    .min(1, 'Link YouTube wajib diisi')
    .refine(
      url => /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)/.test(url),
      'URL YouTube tidak valid (contoh: https://www.youtube.com/watch?v=...)'
    ),
  category: z.string().optional(),
  slug: z.string().optional()
})

type Schema = z.output<typeof schema>

const slugEdited = ref<boolean>(false)
const loading = ref(false)

const state = reactive<Partial<Schema>>({
  title: '',
  description: '',
  link_yt: '',
  category: '',
  slug: ''
})

// Populate form when editing
watch(
  () => props.video,
  (v) => {
    if (v) {
      state.title = v.title
      state.description = v.description ?? ''
      state.link_yt = v.link_yt
      state.category = v.category ?? ''
      state.slug = v.slug ?? ''
    } else {
      state.title = ''
      state.description = ''
      state.link_yt = ''
      state.category = ''
      state.slug = ''
    }
    slugEdited.value = false
  },
  { immediate: true }
)

// Reset on close (create mode)
watch(open, (v) => {
  if (!v && !isEdit.value) {
    state.title = ''
    state.description = ''
    state.link_yt = ''
    state.category = ''
    state.slug = ''
    slugEdited.value = false
  }
})

// Auto-generate slug from title
watch(
  () => state.title,
  (title) => {
    if (!slugEdited.value && title) {
      state.slug = slugify(title)
    }
  }
)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const payload = {
      title: event.data.title,
      description: event.data.description || null,
      link_yt: event.data.link_yt,
      category: event.data.category || null,
      slug: event.data.slug || null,
      updated_at: new Date().toISOString()
    }

    if (isEdit.value && props.video) {
      const { error } = await supabase.from('videos').update(payload).eq('id', props.video.id)
      if (error) throw error
      toast.add({ title: 'Video diperbarui', color: 'success', duration: 2000 })
    } else {
      const { error } = await supabase.from('videos').insert(payload)
      if (error) throw error
      toast.add({ title: 'Video ditambahkan', color: 'success', duration: 2000 })
    }

    emit('saved')
    open.value = false
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEdit ? 'Edit Video' : 'Tambah Video'"
    :description="isEdit ? 'Perbarui informasi video YouTube' : 'Tambahkan video YouTube baru ke daftar'"
  >
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Judul" name="title" required>
          <UInput v-model="state.title" placeholder="Judul video..." class="w-full" />
        </UFormField>

        <UFormField label="Link YouTube" name="link_yt" required>
          <UInput
            v-model="state.link_yt"
            placeholder="https://www.youtube.com/watch?v=..."
            class="w-full"
            leading-icon="i-lucide-youtube"
          />
        </UFormField>

        <UFormField label="Kategori" name="category">
          <UInput v-model="state.category" placeholder="Pertanian, Peternakan, dll..." class="w-full" />
        </UFormField>

        <UFormField label="Deskripsi" name="description">
          <UTextarea
            v-model="state.description"
            placeholder="Deskripsi singkat video..."
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Slug" name="slug">
          <UInput
            v-model="state.slug"
            placeholder="video-slug-url"
            class="w-full"
            @input="() => { slugEdited = true }"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton
            label="Batal"
            color="neutral"
            variant="subtle"
            :disabled="loading"
            @click="open = false"
          />
          <UButton
            :label="isEdit ? 'Simpan Perubahan' : 'Tambah Video'"
            color="primary"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
