<script setup lang="ts">
import type { Database } from '~/types/database.types'

type BannerRow = Database['public']['Tables']['banner']['Row']

const BUCKET_BANNER = 'banner-image'
const supabase = useSupabase()
const toast = useToast()

// ─── Data ─────────────────────────────────────────────────────────────────────
const { data: items, refresh, pending: loading } = useAsyncData(
  'contents-banner',
  async () => {
    const { data, error } = await supabase
      .from('banner')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as BannerRow[]
  },
  { default: () => [] as BannerRow[] }
)

// ─── Storage helpers ──────────────────────────────────────────────────────────
function getUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const { data } = supabase.storage.from(BUCKET_BANNER).getPublicUrl(path)
  return data.publicUrl
}

async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `image/banner-${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET_BANNER)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw new Error(error.message)
  return path
}

// ─── Add modal ────────────────────────────────────────────────────────────────
const modalOpen = ref(false)
const saving = ref(false)
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)

function openAdd() {
  imageFile.value = null
  imagePreview.value = null
  modalOpen.value = true
}

function onImagePick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  imageFile.value = file
  imagePreview.value = URL.createObjectURL(file)
}

async function submit() {
  if (!imageFile.value) {
    toast.add({ title: 'Pilih gambar terlebih dahulu', color: 'warning' })
    return
  }
  saving.value = true
  try {
    const path = await uploadImage(imageFile.value)
    const { error } = await supabase.from('banner').insert({ image_url: path })
    if (error) throw new Error(error.message)
    toast.add({ title: 'Banner ditambahkan', color: 'success' })
    modalOpen.value = false
    await refresh()
  } catch (err: any) {
    toast.add({ title: 'Gagal menambah banner', description: err?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
const deleteOpen = ref(false)
const deleting = ref<BannerRow | null>(null)
const deleteLoading = ref(false)

function openDelete(item: BannerRow) {
  deleting.value = item
  deleteOpen.value = true
}

async function confirmDelete() {
  if (!deleting.value) return
  deleteLoading.value = true
  const { error } = await supabase
    .from('banner')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', deleting.value.id)
  deleteLoading.value = false
  if (error) { toast.add({ title: 'Gagal menghapus', description: error.message, color: 'error' }); return }
  toast.add({ title: 'Banner dihapus', color: 'success' })
  deleteOpen.value = false
  deleting.value = null
  await refresh()
}

// expose for parent header button
defineExpose({ openAdd, refresh, loading })
</script>

<template>
  <!-- Header meta info -->
  <div class="flex items-center gap-3 mb-5">
    <div class="flex items-center gap-2 text-sm">
      <UIcon name="i-lucide-image" class="size-4 text-muted" />
      <span class="text-muted">Total:</span>
      <span class="font-semibold text-highlighted">{{ items.length }} banner</span>
    </div>
    <USeparator orientation="vertical" class="h-4" />
    <p class="text-xs text-muted">Rekomendasi rasio gambar 3:1 atau 4:1</p>
  </div>

  <!-- Loading skeletons -->
  <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 gap-5">
    <div v-for="i in 2" :key="i" class="rounded-2xl bg-elevated animate-pulse h-36" />
  </div>

  <!-- Empty state -->
  <div
    v-else-if="!items.length"
    class="flex flex-col items-center justify-center py-24 gap-4"
  >
    <div class="size-20 rounded-2xl bg-elevated flex items-center justify-center">
      <UIcon name="i-lucide-image" class="size-10 text-dimmed" />
    </div>
    <p class="font-semibold text-highlighted">Belum ada banner</p>
    <p class="text-sm text-muted">Upload gambar banner untuk ditampilkan di aplikasi.</p>
    <UButton icon="i-lucide-upload" label="Upload Banner Pertama" size="sm" @click="openAdd" />
  </div>

  <!-- Banner cards -->
  <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-5">
    <div
      v-for="item in items"
      :key="item.id"
      class="group relative rounded-2xl overflow-hidden border border-default bg-elevated aspect-3/1 shadow-sm"
    >
      <img
        v-if="getUrl(item.image_url)"
        :src="getUrl(item.image_url)!"
        alt="Banner"
        class="size-full object-cover"
      />
      <div v-else class="size-full flex items-center justify-center bg-muted/30">
        <UIcon name="i-lucide-image" class="size-10 text-dimmed" />
      </div>
      <!-- Hover delete overlay -->
      <div
        class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
      >
        <UButton
          icon="i-lucide-trash-2"
          label="Hapus Banner"
          color="error"
          variant="solid"
          size="sm"
          @click="openDelete(item)"
        />
      </div>
      <!-- ID watermark on hover -->
      <div class="absolute bottom-2.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span class="text-xs text-white/60 font-mono">{{ item.id.slice(0, 8) }}…</span>
      </div>
    </div>
  </div>

  <!-- ── Add modal ──────────────────────────────────────────────────────── -->
  <UModal
    v-model:open="modalOpen"
    title="Tambah Banner"
    description="Upload gambar untuk ditampilkan sebagai banner di aplikasi."
  >
    <template #body>
      <div class="space-y-4">
        <label
          class="relative flex cursor-pointer rounded-xl border-2 border-dashed border-default hover:border-primary/50 transition-colors overflow-hidden"
          :class="imagePreview ? 'h-36' : 'h-28'"
        >
          <img v-if="imagePreview" :src="imagePreview" class="size-full object-cover" />
          <div v-else class="size-full flex flex-col items-center justify-center gap-2 text-muted">
            <UIcon name="i-lucide-image-plus" class="size-8" />
            <span class="text-sm">Klik untuk pilih gambar banner</span>
            <span class="text-xs text-dimmed">Rekomendasi rasio 3:1 atau 4:1</span>
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
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="subtle" :disabled="saving" @click="modalOpen = false" />
          <UButton
            label="Upload Banner"
            icon="i-lucide-upload"
            :loading="saving"
            :disabled="!imageFile"
            @click="submit"
          />
        </div>
      </div>
    </template>
  </UModal>

  <!-- ── Delete modal ────────────────────────────────────────────────────── -->
  <UModal
    v-model:open="deleteOpen"
    title="Hapus Banner?"
    description="Banner ini akan dihapus secara permanen."
  >
    <template #body>
      <div class="space-y-4">
        <img
          v-if="getUrl(deleting?.image_url)"
          :src="getUrl(deleting?.image_url)!"
          class="w-full rounded-xl object-cover h-24"
        />
        <div class="flex justify-end gap-2">
          <UButton label="Batal" color="neutral" variant="subtle" :disabled="deleteLoading" @click="deleteOpen = false" />
          <UButton label="Hapus" color="error" icon="i-lucide-trash-2" :loading="deleteLoading" @click="confirmDelete" />
        </div>
      </div>
    </template>
  </UModal>
</template>
