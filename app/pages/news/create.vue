<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, EditorSuggestionMenuItem } from '@nuxt/ui'
import { createImageUploadExtension } from '~/components/news/EditorImageUploadExtension'
import type { Database } from '~/types/database.types'

type Category = Database['public']['Tables']['category_news']['Row']

useHead({ title: 'Buat Berita – Jurutani Admin' })

const supabase = useSupabaseClient()
const toast = useToast()
const router = useRouter()

// Pre-generate ID so storage paths are ready before insert
const newsId = crypto.randomUUID()

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(200),
  sub_title: z.string().max(300).optional(),
  category: z.string().min(1, 'Kategori wajib dipilih'),
  status_news: z.string(),
  slug: z.string().optional(),
  link: z.string().url('URL tidak valid').optional().or(z.literal(''))
})

type Schema = z.output<typeof schema>

// ─── Form state ───────────────────────────────────────────────────────────────
const form = reactive<Schema>({
  title: '',
  sub_title: '',
  category: '',
  status_news: 'pending',
  slug: '',
  link: ''
})

const content = ref<Record<string, any> | null>(null)
const coverFile = ref<File | null>(null)
const coverPreview = ref<string | null>(null)
const galleryFiles = ref<File[]>([])
const galleryUrls = ref<string[]>([])
const newGalleryInput = ref<File[]>([])
const attachmentFiles = ref<File[]>([])
const newAttachmentInput = ref<File[]>([])
const categories = ref<Category[]>([])
const saving = ref(false)
const uploading = ref(false)

// ─── Auto-slug ────────────────────────────────────────────────────────────────
const slugEdited = ref<boolean>(false)
function onTitleInput() {
  if (!slugEdited.value && form.title) {
    form.slug = slugify(form.title)
  }
}

// ─── Cover image ─────────────────────────────────────────────────────────────
watch(coverFile, async (file) => {
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: 'File terlalu besar', description: 'Maksimal 5MB', color: 'error' })
    coverFile.value = null
    return
  }
  // Show local preview immediately
  coverPreview.value = URL.createObjectURL(file)
})

async function uploadCover(): Promise<string | null> {
  if (!coverFile.value) return null
  return await uploadNewsFile('images', newsId, coverFile.value)
}

// ─── Gallery ─────────────────────────────────────────────────────────────────
async function addGalleryFiles(files: File | File[] | null) {
  const list = Array.isArray(files) ? files : files ? [files] : []
  const valid = list.filter(f => f.size <= 5 * 1024 * 1024)
  if (valid.length < list.length) {
    toast.add({ title: 'Beberapa file diabaikan', description: 'Ukuran > 5MB', color: 'warning' })
  }
  galleryFiles.value.push(...valid)
  for (const file of valid) {
    galleryUrls.value.push(URL.createObjectURL(file))
  }
}

function removeGallery(idx: number) {
  galleryFiles.value.splice(idx, 1)
  galleryUrls.value.splice(idx, 1)
}

async function uploadGallery(): Promise<string[]> {
  const urls: string[] = []
  for (const file of galleryFiles.value) {
    const url = await uploadNewsFile('gallery', newsId, file)
    urls.push(url)
  }
  return urls
}

// ─── Attachments ─────────────────────────────────────────────────────────────
type AttachmentItem = { url: string, name: string, type: string, size: number }

async function uploadAttachments(): Promise<AttachmentItem[]> {
  const items: AttachmentItem[] = []
  for (const file of attachmentFiles.value) {
    const url = await uploadNewsFile('attachments', newsId, file)
    items.push({ url, name: file.name, type: file.type, size: file.size })
  }
  return items
}

// ─── Fetch categories ─────────────────────────────────────────────────────────
async function fetchCategories() {
  const { data } = await supabase
    .from('category_news')
    .select('*')
    .is('deleted_at', null)
    .order('name')
  categories.value = data ?? []
}

// ─── Submit ───────────────────────────────────────────────────────────────────
async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  uploading.value = true
  try {
    const [cover, gallery, attachments] = await Promise.all([
      uploadCover(),
      uploadGallery(),
      uploadAttachments()
    ])
    uploading.value = false

    const published_at = event.data.status_news === 'approved' ? new Date().toISOString() : null

    const { error } = await supabase.from('news_updated').insert({
      id: newsId,
      title: event.data.title,
      sub_title: event.data.sub_title || null,
      category: event.data.category,
      status_news: event.data.status_news,
      slug: event.data.slug || slugify(event.data.title),
      link: event.data.link || null,
      content: content.value ?? {},
      cover_image: cover,
      images: gallery.length > 0 ? gallery : null,
      attachments: attachments.length > 0 ? attachments : null,
      published_at,
      user_id: (await supabase.auth.getUser()).data.user?.id ?? null
    })

    if (error) throw error

    toast.add({ title: 'Berita berhasil dibuat', color: 'success' })
    router.push('/news')
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err.message, color: 'error' })
  } finally {
    saving.value = false
    uploading.value = false
  }
}

async function saveDraft() {
  form.status_news = 'pending'
}

const categoryItems = computed(() =>
  categories.value.map(c => ({ label: c.name, value: c.value }))
)

const statusItems = Enum.StatusNews.map(s => ({ label: s.label, value: s.value }))

// ─── Editor setup ─────────────────────────────────────────────────────────────
const editorExtensions = [createImageUploadExtension(newsId)] as any[]

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
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough' },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code' }
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide-list' },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered' },
    { kind: 'blockquote', icon: 'i-lucide-quote' },
    { kind: 'codeBlock', icon: 'i-lucide-square-code' },
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
    { kind: 'codeBlock', label: 'Code Block', icon: 'i-lucide-square-code' },
    { kind: 'horizontalRule', label: 'Divider', icon: 'i-lucide-separator-horizontal' }
  ]
]

// Watch newGalleryInput to process newly selected files
watch(newGalleryInput, async (files) => {
  if (!files || files.length === 0) return
  await addGalleryFiles(files)
  newGalleryInput.value = []
})

// Watch newAttachmentInput to queue files for upload
watch(newAttachmentInput, (files) => {
  if (!files || files.length === 0) return
  attachmentFiles.value.push(...files)
  newAttachmentInput.value = []
})

onMounted(fetchCategories)
</script>

<template>
  <UDashboardPanel id="news-create">
    <template #header>
      <UDashboardNavbar title="Buat Berita Baru">
        <template #leading>
          <UButton
            to="/news"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </template>
        <template #right>
          <UButton
            color="neutral"
            variant="outline"
            label="Simpan Draft"
            :loading="saving"
            @click="saveDraft"
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
          <!-- ── Main column ─────────────────────────────────────────── -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Article info -->
            <UPageCard title="Informasi Artikel" description="Judul, sub judul, dan slug akan muncul di halaman publik.">
              <div class="space-y-4">
                <UFormField name="title" label="Judul *">
                  <UInput
                    v-model="form.title"
                    placeholder="Masukkan judul berita..."
                    class="w-full"
                    @input="onTitleInput"
                  />
                </UFormField>

                <UFormField name="sub_title" label="Sub Judul">
                  <UInput
                    v-model="form.sub_title"
                    placeholder="Ringkasan singkat artikel (opsional)..."
                    class="w-full"
                  />
                </UFormField>

                <UFormField name="slug" label="Slug URL">
                  <UInput
                    v-model="form.slug"
                    placeholder="slug-url-artikel"
                    class="w-full font-mono text-sm"
                    @input="() => { slugEdited = true }"
                  />
                  <template #hint>
                    <span class="text-xs text-muted">
                      /news/preview/<span class="text-highlighted">{{ form.slug || 'slug-url-artikel' }}</span>
                    </span>
                  </template>
                </UFormField>
              </div>
            </UPageCard>

            <!-- Content editor -->
            <UPageCard title="Konten" description="Tulis isi artikel menggunakan editor di bawah ini.">
              <div class="border border-muted rounded-lg overflow-hidden min-h-96">
                <UEditor
                  v-slot="{ editor }"
                  v-model="content"
                  content-type="json"
                  :extensions="editorExtensions"
                  :handlers="(editorHandlers as any)"
                  placeholder="Mulai menulis konten artikel..."
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
          </div>

          <!-- ── Sidebar ─────────────────────────────────────────────── -->
          <div class="space-y-6">
            <!-- Publish settings -->
            <UPageCard title="Pengaturan Publikasi">
              <div class="space-y-4">
                <UFormField name="status_news" label="Status">
                  <USelect
                    v-model="form.status_news"
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

                <UFormField name="link" label="Link Eksternal">
                  <UInput
                    v-model="form.link"
                    placeholder="https://..."
                    class="w-full"
                  />
                </UFormField>
              </div>

              <div class="flex gap-2 mt-6">
                <UButton
                  type="submit"
                  class="flex-1"
                  :loading="saving"
                >
                  {{ saving ? (uploading ? 'Mengunggah...' : 'Menyimpan...') : 'Simpan' }}
                </UButton>
              </div>
            </UPageCard>

            <!-- Cover Image -->
            <UPageCard title="Gambar Cover">
              <div class="space-y-3">
                <div
                  v-if="coverPreview"
                  class="relative rounded-lg overflow-hidden aspect-video bg-muted"
                >
                  <img :src="coverPreview" class="size-full object-cover" alt="Cover preview">
                  <UButton
                    icon="i-lucide-x"
                    color="error"
                    variant="solid"
                    size="xs"
                    class="absolute top-2 right-2"
                    @click="coverFile = null; coverPreview = null"
                  />
                </div>
                <UFileUpload
                  v-else
                  v-model="coverFile"
                  accept="image/*"
                  label="Upload cover"
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
            <UPageCard title="Galeri Gambar">
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
                  label="Tambah gambar galeri"
                  description="Bisa multiple · maks 5MB/file"
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
                  description="PDF, DOC, XLS, video, dll"
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
