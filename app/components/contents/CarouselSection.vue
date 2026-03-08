<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Database } from '~/types/database.types'

type HeroRow = Database['public']['Tables']['hero_data']['Row']

const BUCKET_HERO = 'hero-image'
const supabase = useSupabase()
const toast = useToast()

// ─── Data ─────────────────────────────────────────────────────────────────────
const { data: items, refresh, pending: loading } = useAsyncData(
  'contents-hero',
  async () => {
    const { data, error } = await supabase
      .from('hero_data')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as HeroRow[]
  },
  { default: () => [] as HeroRow[] }
)

// counts for header
const activeCount = computed(() => items.value.filter(i => i.status === 'active').length)

// ─── Storage helpers ──────────────────────────────────────────────────────────
function getUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from(BUCKET_HERO).getPublicUrl(path)
  return data.publicUrl
}

async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `hero-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET_HERO)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw new Error(error.message)
  return path
}

// ─── Status toggle ────────────────────────────────────────────────────────────
async function toggleStatus(item: HeroRow) {
  const newStatus = item.status === 'active' ? 'inactive' : 'active'
  const { error } = await supabase.from('hero_data').update({ status: newStatus }).eq('id', item.id)
  if (error) { toast.add({ title: 'Gagal mengubah status', description: error.message, color: 'error' }); return }
  await refresh()
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────
const modalOpen = ref(false)
const editing = ref<HeroRow | null>(null)
const saving = ref(false)
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

const schema = z.object({
  title: z.string().min(2, 'Judul minimal 2 karakter'),
  caption: z.string(),
  description: z.string(),
  button_text: z.string(),
  button_link: z.string(),
  status: z.enum(['active', 'inactive'])
})
type Schema = z.output<typeof schema>

const state = reactive<Schema>({
  title: '', caption: '', description: '',
  button_text: '', button_link: '', status: 'active'
})

function openAdd() {
  editing.value = null
  Object.assign(state, { title: '', caption: '', description: '', button_text: '', button_link: '', status: 'active' })
  imageFile.value = null
  imagePreview.value = null
  modalOpen.value = true
}

function openEdit(item: HeroRow) {
  editing.value = item
  Object.assign(state, {
    title: item.title ?? '',
    caption: item.caption ?? '',
    description: item.description ?? '',
    button_text: item.button_text ?? '',
    button_link: item.button_link ?? '',
    status: (item.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive'
  })
  imageFile.value = null
  imagePreview.value = getUrl(item.image_url)
  modalOpen.value = true
}

function onImagePick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  try {
    let image_url = editing.value?.image_url ?? undefined
    if (imageFile.value) image_url = await uploadImage(imageFile.value)
    const payload: Record<string, any> = {
      title: event.data.title,
      caption: event.data.caption || null,
      description: event.data.description || null,
      button_text: event.data.button_text || null,
      button_link: event.data.button_link || null,
      status: event.data.status,
      ...(image_url !== undefined && { image_url })
    }
    const { error } = editing.value
      ? await supabase.from('hero_data').update(payload).eq('id', editing.value.id)
      : await supabase.from('hero_data').insert(payload)
    if (error) throw new Error(error.message)
    toast.add({ title: editing.value ? 'Slide diperbarui' : 'Slide ditambahkan', color: 'success' })
    modalOpen.value = false
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const deleteOpen = ref(false)
const deleting = ref<HeroRow | null>(null)
const deleteLoading = ref(false)

function openDelete(item: HeroRow) {
  deleting.value = item
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  const { error } = await supabase
    .from('hero_data')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', deleting.value.id)
  deleteLoading.value = false
  if (error) { toast.add({ title: 'Gagal menghapus', description: error.message, color: 'error' }); return }
  toast.add({ title: 'Slide dihapus', color: 'success' })
  deleteOpen.value = false
  deleting.value = null
  await refresh()
}

// expose for parent header button
defineExpose({ openAdd, refresh, loading })
</script>

<template>
  <!-- Section meta info -->
  <div class="flex items-center gap-3 mb-5">
    <div class="flex items-center gap-2 text-sm">
      <UIcon name="i-lucide-layers" class="size-4 text-muted" />
      <span class="text-muted">Total:</span>
      <span class="font-semibold text-highlighted">{{ items.length }} slide</span>
    </div>
    <USeparator orientation="vertical" class="h-4" />
    <div class="flex items-center gap-1.5 text-sm">
      <span class="size-2 rounded-full bg-success inline-block" />
      <span class="text-muted">Aktif:</span>
      <span class="font-semibold text-highlighted">{{ activeCount }}</span>
    </div>
    <div class="flex items-center gap-1.5 text-sm">
      <span class="size-2 rounded-full bg-muted inline-block" />
      <span class="text-muted">Nonaktif:</span>
      <span class="font-semibold text-highlighted">{{ items.length - activeCount }}</span>
    </div>
  </div>

  <!-- Loading skeletons -->
  <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
    <div v-for="i in 4" :key="i" class="rounded-2xl bg-elevated animate-pulse h-64" />
  </div>

  <!-- Empty state -->
  <div
    v-else-if="!items.length"
    class="flex flex-col items-center justify-center py-24 gap-4"
  >
    <div class="size-20 rounded-2xl bg-elevated flex items-center justify-center">
      <UIcon name="i-lucide-image-play" class="size-10 text-dimmed" />
    </div>
    <p class="font-semibold text-highlighted">Belum ada slide carousel</p>
    <p class="text-sm text-muted">Tambahkan slide pertama untuk ditampilkan di halaman utama.</p>
    <UButton icon="i-lucide-plus" label="Tambah Slide Pertama" size="sm" @click="openAdd" />
  </div>

  <!-- Slide cards grid -->
  <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="group relative rounded-2xl overflow-hidden border flex flex-col shadow-sm hover:shadow-md transition-all"
      :class="item.status === 'inactive'
        ? 'border-default bg-elevated/50 opacity-70 hover:opacity-100'
        : 'border-default bg-elevated'"
    >
      <!-- Image area -->
      <div class="relative h-44 bg-muted/30 overflow-hidden shrink-0">
        <img
          v-if="getUrl(item.image_url)"
          :src="getUrl(item.image_url)!"
          :alt="item.title ?? ''"
          class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          :class="item.status === 'inactive' ? 'grayscale' : ''"
        />
        <div v-else class="size-full flex items-center justify-center">
          <UIcon name="i-lucide-image" class="size-14 text-dimmed" />
        </div>
        <!-- Gradient overlay -->
        <div class="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
        <!-- Index badge -->
        <div class="absolute top-3 left-3">
          <span class="inline-flex items-center justify-center size-7 rounded-full bg-black/50 text-white text-xs font-bold backdrop-blur-sm ring-1 ring-white/20">
            {{ index + 1 }}
          </span>
        </div>
        <!-- Status badge -->
        <div class="absolute top-3 right-3">
          <UBadge
            :label="item.status === 'active' ? 'Aktif' : 'Nonaktif'"
            :color="item.status === 'active' ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          />
        </div>
        <!-- Caption chip -->
        <div v-if="item.caption" class="absolute bottom-3 left-3">
          <span class="inline-block px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-sm text-white text-xs font-medium ring-1 ring-white/20">
            {{ item.caption }}
          </span>
        </div>
      </div>

      <!-- Card body -->
      <div class="flex flex-col flex-1 p-4 gap-1.5">
        <p class="font-semibold text-highlighted text-sm leading-snug line-clamp-1">
          {{ item.title }}
        </p>
        <p class="text-xs text-muted leading-relaxed line-clamp-2 flex-1">
          {{ item.description ?? '–' }}
        </p>
        <div v-if="item.button_text" class="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-default">
          <UIcon name="i-lucide-mouse-pointer-click" class="size-3 text-muted shrink-0" />
          <span class="text-xs font-medium text-muted truncate">{{ item.button_text }}</span>
          <UIcon name="i-lucide-arrow-right" class="size-3 text-dimmed shrink-0" />
          <span class="text-xs text-dimmed truncate">{{ item.button_link }}</span>
        </div>
      </div>

      <!-- Hover action strip (slides up) -->
      <div
        class="absolute bottom-0 inset-x-0 flex items-center justify-between gap-2 px-3.5 py-2.5 bg-elevated/95 border-t border-default backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform duration-200"
      >
        <UButton
          :label="item.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'"
          :icon="item.status === 'active' ? 'i-lucide-eye-off' : 'i-lucide-eye'"
          color="neutral"
          variant="soft"
          size="xs"
          @click="toggleStatus(item)"
        />
        <div class="flex gap-1.5">
          <UButton icon="i-lucide-pencil" color="neutral" variant="outline" size="xs" @click="openEdit(item)" />
          <UButton icon="i-lucide-trash-2" color="error" variant="soft" size="xs" @click="openDelete(item)" />
        </div>
      </div>
    </div>
  </div>

  <!-- ── Add / Edit modal ────────────────────────────────────────────────── -->
  <UModal
    v-model:open="modalOpen"
    :title="editing ? 'Edit Slide Carousel' : 'Tambah Slide Carousel'"
    :ui="{ content: 'max-w-xl' }"
  >
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <!-- Image upload -->
        <div>
          <p class="text-sm font-medium text-highlighted mb-1.5">Gambar Slide</p>
          <label
            class="relative flex cursor-pointer rounded-xl border-2 border-dashed border-default hover:border-primary/50 transition-colors overflow-hidden"
            :class="imagePreview ? 'h-44' : 'h-32'"
          >
            <img v-if="imagePreview" :src="imagePreview" class="size-full object-cover" />
            <div v-else class="size-full flex flex-col items-center justify-center gap-2 text-muted">
              <UIcon name="i-lucide-image-plus" class="size-8" />
              <span class="text-sm">Klik untuk pilih gambar</span>
              <span class="text-xs text-dimmed">JPG, PNG, WebP</span>
            </div>
            <div
              v-if="imagePreview"
              class="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <span class="text-white text-sm font-medium flex items-center gap-1.5">
                <UIcon name="i-lucide-image-plus" class="size-4" />Ganti Gambar
              </span>
            </div>
            <input type="file" accept="image/*" class="sr-only" @change="onImagePick" />
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Caption" name="caption">
            <UInput v-model="state.caption" placeholder="Pertanian Modern" class="w-full" />
          </UFormField>
          <UFormField label="Judul" name="title">
            <UInput v-model="state.title" placeholder="Penyuluhan Digital" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Deskripsi" name="description">
          <UTextarea v-model="state.description" placeholder="Ikuti penyuluhan digital..." :rows="3" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Teks Tombol" name="button_text">
            <UInput v-model="state.button_text" placeholder="Pelajari Selengkapnya" class="w-full" />
          </UFormField>
          <UFormField label="Link Tombol" name="button_link">
            <UInput v-model="state.button_link" placeholder="/discussions" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Status" name="status">
          <div class="flex gap-3">
            <label
              class="flex-1 flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors"
              :class="state.status === 'active' ? 'border-success/60 bg-success/5' : 'border-default'"
            >
              <input v-model="state.status" type="radio" value="active" class="sr-only" />
              <UIcon name="i-lucide-eye" class="size-4 shrink-0" :class="state.status === 'active' ? 'text-success' : 'text-muted'" />
              <div>
                <p class="text-sm font-medium" :class="state.status === 'active' ? 'text-success' : 'text-highlighted'">Aktif</p>
                <p class="text-xs text-muted">Ditampilkan di app</p>
              </div>
            </label>
            <label
              class="flex-1 flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors"
              :class="state.status === 'inactive' ? 'border-default bg-muted/30' : 'border-default'"
            >
              <input v-model="state.status" type="radio" value="inactive" class="sr-only" />
              <UIcon name="i-lucide-eye-off" class="size-4 shrink-0 text-muted" />
              <div>
                <p class="text-sm font-medium text-highlighted">Nonaktif</p>
                <p class="text-xs text-muted">Disembunyikan</p>
              </div>
            </label>
          </div>
        </UFormField>

        <div class="flex justify-end gap-2 pt-1">
          <UButton label="Batal" color="neutral" variant="subtle" :disabled="saving" @click="modalOpen = false" />
          <UButton
            :label="editing ? 'Simpan Perubahan' : 'Tambah Slide'"
            :icon="editing ? 'i-lucide-save' : 'i-lucide-plus'"
            type="submit"
            :loading="saving"
          />
        </div>
      </UForm>
    </template>
  </UModal>

  <!-- ── Delete modal ────────────────────────────────────────────────────── -->
  <UModal
    v-model:open="deleteOpen"
    title="Hapus Slide?"
    :description="`Hapus slide &quot;${deleting?.title}&quot;? Tindakan ini tidak dapat dibatalkan.`"
  >
    <template #body>
      <img
        v-if="getUrl(deleting?.image_url)"
        :src="getUrl(deleting?.image_url)!"
        class="w-full rounded-xl object-cover h-32 mb-4"
      />
      <div class="flex justify-end gap-2">
        <UButton label="Batal" color="neutral" variant="subtle" :disabled="deleteLoading" @click="deleteOpen = false" />
        <UButton label="Hapus Slide" color="error" icon="i-lucide-trash-2" :loading="deleteLoading" @click="confirmDelete" />
      </div>
    </template>
  </UModal>
</template>
