<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, EditorSuggestionMenuItem } from '@nuxt/ui'
import { createImageUploadExtension } from '~/components/news/EditorImageUploadExtension'
import type { Database } from '~/types/database.types'

type CategoryMarket = Database['public']['Tables']['category_markets']['Row']

useHead({ title: 'Tambah Produk – Jurutani Admin' })

const supabase = useSupabase()
const toast = useToast()
const router = useRouter()

// Pre-generate ID so storage paths are ready before insert
const marketId = crypto.randomUUID()

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi').max(200),
  excerpt: z.string().max(300).optional(),
  category: z.string().min(1, 'Kategori wajib dipilih'),
  status: z.string(),
  slug: z.string().optional(),
  seller: z.string().min(1, 'Nama penjual wajib diisi'),
  contact_seller: z.string().optional(),
  // price mode: 'fixed' | 'range'
  price_mode: z.enum(['fixed', 'range']),
  price: z.number({ invalid_type_error: 'Harga harus berupa angka' }).min(0).optional().nullable(),
  price_unit: z.string().max(20).optional(),
  price_range: z.string().max(100).optional()
})

type Schema = z.output<typeof schema>

// ─── Form state ───────────────────────────────────────────────────────────────
const form = reactive<Schema>({
  name: '',
  excerpt: '',
  category: '',
  status: 'pending',
  slug: '',
  seller: '',
  contact_seller: '',
  price_mode: 'fixed',
  price: null,
  price_unit: '',
  price_range: ''
})

const content = ref<Record<string, any> | null>(null)
const categories = ref<CategoryMarket[]>([])
const saving = ref(false)
const uploading = ref(false)

// ─── Links ────────────────────────────────────────────────────────────────────
type LinkItem = { label: string, url: string }
const links = ref<LinkItem[]>([])

function addLink() {
  links.value.push({ label: '', url: '' })
}

function removeLink(idx: number) {
  links.value.splice(idx, 1)
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────
const thumbnailFile = ref<File | null>(null)
const thumbnailPreview = ref<string | null>(null)

watch(thumbnailFile, (file) => {
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: 'File terlalu besar', description: 'Maksimal 5MB', color: 'error' })
    thumbnailFile.value = null
    return
  }
  thumbnailPreview.value = URL.createObjectURL(file)
})

async function uploadThumbnail(): Promise<string | null> {
  if (!thumbnailFile.value) return null
  return await uploadMarketFile('thumbnail', marketId, thumbnailFile.value)
}

// ─── Gallery ─────────────────────────────────────────────────────────────────
const galleryFiles = ref<File[]>([])
const galleryUrls = ref<string[]>([])
const newGalleryInput = ref<File[]>([])

function addGalleryFiles(files: File | File[] | null) {
  const list = Array.isArray(files) ? files : files ? [files] : []
  const valid = list.filter(f => f.size <= 5 * 1024 * 1024)
  if (valid.length < list.length) {
    toast.add({ title: 'Beberapa file diabaikan', description: 'Ukuran > 5MB', color: 'warning' })
  }
  galleryFiles.value.push(...valid)
  for (const f of valid) galleryUrls.value.push(URL.createObjectURL(f))
}

function removeGallery(idx: number) {
  galleryFiles.value.splice(idx, 1)
  galleryUrls.value.splice(idx, 1)
}

async function uploadGallery(): Promise<string[]> {
  const urls: string[] = []
  for (const file of galleryFiles.value) {
    const url = await uploadMarketFile('gallery', marketId, file)
    urls.push(url)
  }
  return urls
}

watch(newGalleryInput, (files) => {
  if (!files || files.length === 0) return
  addGalleryFiles(files)
  newGalleryInput.value = []
})

// ─── Attachments ─────────────────────────────────────────────────────────────
type AttachmentItem = { url: string, name: string, type: string, size: number }
const attachmentFiles = ref<File[]>([])
const newAttachmentInput = ref<File[]>([])

async function uploadAttachments(): Promise<AttachmentItem[]> {
  const items: AttachmentItem[] = []
  for (const file of attachmentFiles.value) {
    const url = await uploadMarketFile('attachments', marketId, file)
    items.push({ url, name: file.name, type: file.type, size: file.size })
  }
  return items
}

watch(newAttachmentInput, (files) => {
  if (!files || files.length === 0) return
  attachmentFiles.value.push(...files)
  newAttachmentInput.value = []
})

// ─── Auto-slug ────────────────────────────────────────────────────────────────
const slugEdited = ref<boolean>(false)
function onNameInput() {
  if (!slugEdited.value && form.name) {
    form.slug = slugify(form.name)
  }
}

// ─── Categories & user ───────────────────────────────────────────────────────
async function fetchCategories() {
  const { data } = await supabase
    .from('category_markets')
    .select('*')
    .is('deleted_at', null)
    .order('name')
  categories.value = data ?? []
}

async function prefillSeller() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()
  if (profile?.full_name) form.seller = profile.full_name
}

// ─── Submit ───────────────────────────────────────────────────────────────────
async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  uploading.value = true
  try {
    const [thumbnailUrl, gallery, attachments] = await Promise.all([
      uploadThumbnail(),
      uploadGallery(),
      uploadAttachments()
    ])
    uploading.value = false

    const validLinks = links.value.filter(l => l.label && l.url)
    const published_at = event.data.status === 'approved' ? new Date().toISOString() : null

    const { error } = await supabase.from('product_markets').insert({
      id: marketId,
      name: event.data.name,
      excerpt: event.data.excerpt || null,
      category: event.data.category,
      status: event.data.status,
      slug: event.data.slug || slugify(event.data.name),
      seller: event.data.seller,
      contact_seller: event.data.contact_seller || null,
      price: event.data.price_mode === 'fixed' ? (event.data.price ?? null) : null,
      price_unit: event.data.price_mode === 'fixed' ? (event.data.price_unit || null) : null,
      price_range: event.data.price_mode === 'range' ? (event.data.price_range || null) : null,
      content: content.value ?? {},
      thumbnail_url: thumbnailUrl,
      images: gallery.length > 0 ? gallery : [],
      attachments: attachments.length > 0 ? attachments : [],
      links: validLinks,
      published_at,
      user_id: (await supabase.auth.getUser()).data.user?.id ?? null
    })

    if (error) throw error

    toast.add({ title: 'Produk berhasil ditambahkan', color: 'success' })
    router.push('/markets')
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err.message, color: 'error' })
  } finally {
    saving.value = false
    uploading.value = false
  }
}

// ─── Editor ───────────────────────────────────────────────────────────────────
const editorExtensions = [createImageUploadExtension(marketId)] as any[]

const editorHandlers = {
  imageUpload: {
    canExecute: (editor: any) => editor.can().insertContent({ type: 'imageUpload' }),
    execute: (editor: any) => editor.chain().focus().insertContent({ type: 'imageUpload' }),
    isActive: (editor: any) => editor.isActive('imageUpload'),
    isDisabled: undefined
  }
}

const toolbarItems = [
  [{ kind: 'imageUpload', icon: 'i-lucide-image', label: 'Upload Gambar', variant: 'soft' as const }],
  [{
    icon: 'i-lucide-heading',
    content: { align: 'start' as const },
    items: [
      { kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: 'Heading 1' },
      { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: 'Heading 2' },
      { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: 'Heading 3' }
    ]
  }],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold' },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic' },
    { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline' },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough' }
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide-list' },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered' },
    { kind: 'blockquote', icon: 'i-lucide-quote' },
    { kind: 'horizontalRule', icon: 'i-lucide-separator-horizontal' }
  ],
  [{ kind: 'link', icon: 'i-lucide-link' }],
  [
    { kind: 'undo', icon: 'i-lucide-undo-2' },
    { kind: 'redo', icon: 'i-lucide-redo-2' }
  ]
] as any[][]

const suggestionItems: EditorSuggestionMenuItem[][] = [
  [
    { type: 'label', label: 'Teks' },
    { kind: 'paragraph', label: 'Paragraf', icon: 'i-lucide-type' },
    { kind: 'heading', level: 1, label: 'Heading 1', icon: 'i-lucide-heading-1' },
    { kind: 'heading', level: 2, label: 'Heading 2', icon: 'i-lucide-heading-2' },
    { kind: 'heading', level: 3, label: 'Heading 3', icon: 'i-lucide-heading-3' }
  ],
  [
    { type: 'label', label: 'List' },
    { kind: 'bulletList', label: 'Bullet List', icon: 'i-lucide-list' },
    { kind: 'orderedList', label: 'Numbered List', icon: 'i-lucide-list-ordered' }
  ],
  [
    { type: 'label', label: 'Insert' },
    { kind: 'blockquote', label: 'Blockquote', icon: 'i-lucide-text-quote' },
    { kind: 'horizontalRule', label: 'Divider', icon: 'i-lucide-separator-horizontal' }
  ]
]

const categoryItems = computed(() =>
  categories.value.map(c => ({ label: c.name, value: c.value }))
)

const statusItems = Enum.StatusMarkets.map(s => ({ label: s.label, value: s.value }))

onMounted(() => {
  fetchCategories()
  prefillSeller()
})
</script>

<template>
  <UDashboardPanel id="markets-create">
    <template #header>
      <UDashboardNavbar title="Tambah Produk Baru">
        <template #leading>
          <UButton
            to="/markets"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UForm
        :schema="schema"
        :state="form"
        class="h-full"
        @submit="onSubmit"
      >
        <div class="grid lg:grid-cols-3 gap-6">
          <!-- ── Main column ──────────────────────────────────────────── -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Product info -->
            <UPageCard title="Informasi Produk" description="Nama, ringkasan, dan slug akan tampil di halaman publik.">
              <div class="space-y-4">
                <UFormField name="name" label="Nama Produk *">
                  <UInput
                    v-model="form.name"
                    placeholder="Masukkan nama produk..."
                    class="w-full"
                    @input="onNameInput"
                  />
                </UFormField>

                <UFormField name="excerpt" label="Ringkasan">
                  <UInput
                    v-model="form.excerpt"
                    placeholder="Deskripsi singkat produk (opsional)..."
                    class="w-full"
                  />
                </UFormField>

                <UFormField name="slug" label="Slug URL">
                  <UInput
                    v-model="form.slug"
                    placeholder="slug-produk"
                    class="w-full font-mono text-sm"
                    @input="() => { slugEdited = true }"
                  />
                  <template #hint>
                    <span class="text-xs text-muted">
                      /markets/<span class="text-highlighted">{{ form.slug || 'slug-produk' }}</span>
                    </span>
                  </template>
                </UFormField>
              </div>
            </UPageCard>

            <!-- Rich content -->
            <UPageCard title="Deskripsi Produk" description="Detail lengkap produk, keunggulan, cara penggunaan, dll.">
              <div class="border border-muted rounded-lg overflow-hidden min-h-96">
                <UEditor
                  v-slot="{ editor }"
                  v-model="content"
                  content-type="json"
                  :extensions="editorExtensions"
                  :handlers="(editorHandlers as any)"
                  placeholder="Tulis deskripsi produk secara lengkap..."
                  class="min-h-80"
                >
                  <UEditorToolbar
                    :editor="editor"
                    :items="(toolbarItems as any)"
                    class="border-b border-muted py-1.5 px-2 overflow-x-auto"
                  />
                  <UEditorSuggestionMenu :editor="editor" :items="suggestionItems" />
                </UEditor>
              </div>
            </UPageCard>

            <!-- Seller info -->
            <UPageCard title="Informasi Penjual">
              <div class="grid sm:grid-cols-2 gap-4">
                <UFormField name="seller" label="Nama Penjual / Toko *">
                  <UInput
                    v-model="form.seller"
                    placeholder="Nama toko atau penjual..."
                    class="w-full"
                  />
                </UFormField>

                <UFormField name="contact_seller" label="Kontak Penjual">
                  <UInput
                    v-model="form.contact_seller"
                    placeholder="No. HP / WhatsApp..."
                    class="w-full"
                  />
                </UFormField>
              </div>
            </UPageCard>

            <!-- Price -->
            <UPageCard title="Harga">
              <div class="space-y-4">
                <!-- Price mode toggle -->
                <div class="flex rounded-lg border border-default overflow-hidden w-fit">
                  <button
                    type="button"
                    class="px-4 py-1.5 text-sm transition-colors"
                    :class="form.price_mode === 'fixed'
                      ? 'bg-primary text-white font-medium'
                      : 'text-muted hover:bg-elevated'"
                    @click="form.price_mode = 'fixed'"
                  >
                    Harga Tetap
                  </button>
                  <button
                    type="button"
                    class="px-4 py-1.5 text-sm transition-colors"
                    :class="form.price_mode === 'range'
                      ? 'bg-primary text-white font-medium'
                      : 'text-muted hover:bg-elevated'"
                    @click="form.price_mode = 'range'"
                  >
                    Range Harga
                  </button>
                </div>

                <div v-if="form.price_mode === 'fixed'" class="grid sm:grid-cols-2 gap-4">
                  <UFormField name="price" label="Harga (Rp)">
                    <UInput
                      v-model="form.price"
                      type="number"
                      placeholder="0"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField name="price_unit" label="Satuan">
                    <UInput
                      v-model="form.price_unit"
                      placeholder="kg, ikat, botol, ekor..."
                      class="w-full"
                    />
                  </UFormField>
                </div>

                <div v-if="form.price_mode === 'range'">
                  <UFormField name="price_range" label="Range Harga">
                    <UInput
                      v-model="form.price_range"
                      placeholder="Contoh: Rp 5.000 – Rp 10.000 / kg"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </div>
            </UPageCard>

            <!-- Links -->
            <UPageCard title="Link Toko" description="Tambahkan link ke platform marketplace atau website produk.">
              <div class="space-y-3">
                <div
                  v-for="(link, idx) in links"
                  :key="idx"
                  class="flex items-center gap-2"
                >
                  <UInput
                    v-model="link.label"
                    placeholder="Label (Shopee, Tokopedia...)"
                    class="w-36 shrink-0"
                  />
                  <UInput
                    v-model="link.url"
                    placeholder="https://..."
                    class="flex-1"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    size="sm"
                    @click="removeLink(idx)"
                  />
                </div>
                <UButton
                  icon="i-lucide-plus"
                  color="neutral"
                  variant="outline"
                  label="Tambah Link"
                  size="sm"
                  @click="addLink"
                />
              </div>
            </UPageCard>
          </div>

          <!-- ── Sidebar ──────────────────────────────────────────────── -->
          <div class="space-y-6">
            <!-- Publish settings -->
            <UPageCard title="Pengaturan Publikasi">
              <div class="space-y-4">
                <UFormField name="status" label="Status">
                  <USelect
                    v-model="form.status"
                    :items="statusItems"
                    class="w-full"
                  />
                </UFormField>

                <UFormField name="category" label="Kategori *">
                  <USelect
                    v-model="form.category"
                    :items="categoryItems"
                    placeholder="Pilih kategori..."
                    class="w-full"
                  />
                </UFormField>
              </div>

              <div class="mt-6">
                <UButton
                  type="submit"
                  class="w-full"
                  :loading="saving"
                >
                  {{ saving ? (uploading ? 'Mengunggah...' : 'Menyimpan...') : 'Simpan Produk' }}
                </UButton>
              </div>
            </UPageCard>

            <!-- Thumbnail -->
            <UPageCard title="Foto Produk (Thumbnail)">
              <div class="space-y-3">
                <div
                  v-if="thumbnailPreview"
                  class="relative rounded-lg overflow-hidden aspect-video bg-muted"
                >
                  <img :src="thumbnailPreview" class="size-full object-cover" alt="Thumbnail">
                  <UButton
                    icon="i-lucide-x"
                    color="error"
                    variant="solid"
                    size="xs"
                    class="absolute top-2 right-2"
                    @click="thumbnailFile = null; thumbnailPreview = null"
                  />
                </div>
                <UFileUpload
                  v-else
                  v-model="thumbnailFile"
                  accept="image/*"
                  label="Upload foto utama"
                  description="PNG, JPG, WebP · maks 5MB"
                  :preview="false"
                >
                  <template #leading>
                    <UIcon name="i-lucide-image" class="size-7 text-muted" />
                  </template>
                </UFileUpload>
              </div>
            </UPageCard>

            <!-- Gallery -->
            <UPageCard title="Galeri Foto">
              <div class="space-y-3">
                <div
                  v-if="galleryUrls.length > 0"
                  class="grid grid-cols-3 gap-2"
                >
                  <div
                    v-for="(url, idx) in galleryUrls"
                    :key="idx"
                    class="relative rounded-md overflow-hidden aspect-square bg-muted group"
                  >
                    <img :src="url" class="size-full object-cover" alt="">
                    <button
                      class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      @click="removeGallery(idx)"
                    >
                      <UIcon name="i-lucide-trash-2" class="size-5 text-white" />
                    </button>
                  </div>
                </div>
                <UFileUpload
                  v-model="newGalleryInput"
                  accept="image/*"
                  label="Tambah foto galeri"
                  description="Multiple · maks 5MB/foto"
                  :preview="false"
                  multiple
                >
                  <template #leading>
                    <UIcon name="i-lucide-images" class="size-6 text-muted" />
                  </template>
                </UFileUpload>
              </div>
            </UPageCard>

            <!-- Attachments -->
            <UPageCard title="Lampiran">
              <div class="space-y-3">
                <div v-if="attachmentFiles.length > 0" class="space-y-1.5">
                  <div
                    v-for="(file, idx) in attachmentFiles"
                    :key="idx"
                    class="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-elevated/50"
                  >
                    <UIcon name="i-lucide-paperclip" class="size-4 text-muted shrink-0" />
                    <span class="flex-1 truncate text-highlighted">{{ file.name }}</span>
                    <span class="text-xs text-muted">{{ (file.size / 1024).toFixed(0) }} KB</span>
                    <UButton
                      icon="i-lucide-x"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      @click="attachmentFiles.splice(idx, 1)"
                    />
                  </div>
                </div>
                <UFileUpload
                  v-model="newAttachmentInput"
                  label="Upload lampiran"
                  description="PDF, DOC, XLS, dll"
                  :preview="false"
                  multiple
                >
                  <template #leading>
                    <UIcon name="i-lucide-paperclip" class="size-6 text-muted" />
                  </template>
                </UFileUpload>
              </div>
            </UPageCard>
          </div>
        </div>
      </UForm>
    </template>
  </UDashboardPanel>
</template>
