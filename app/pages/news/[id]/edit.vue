<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, EditorSuggestionMenuItem } from '@nuxt/ui'
import { createImageUploadExtension } from '~/components/news/EditorImageUploadExtension'
import type { Database } from '~/types/database.types'

type NewsRow = Database['public']['Tables']['news_updated']['Row']
type Category = Database['public']['Tables']['category_news']['Row']

useHead({ title: 'Edit Berita – Jurutani Admin' })

const supabase = useSupabase()
const toast = useToast()
const router = useRouter()
const route = useRoute()

const newsId = route.params.id as string

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
const originalData = ref<NewsRow | null>(null)

const coverFile = ref<File | null>(null)
const coverPreview = ref<string | null>(null)
const originalCoverUrl = ref<string | null>(null)

const galleryFiles = ref<File[]>([])
const existingGalleryUrls = ref<string[]>([])
const newGalleryPreviews = ref<string[]>([])
const newGalleryInput = ref<File[]>([])

type AttachmentItem = { url: string, name: string, type: string, size: number }
const existingAttachments = ref<AttachmentItem[]>([])
const newAttachmentFiles = ref<File[]>([])
const newAttachmentInput = ref<File[]>([])

const categories = ref<Category[]>([])
const pending = ref(true)
const saving = ref(false)
const uploading = ref(false)

// ─── Load news ────────────────────────────────────────────────────────────────
async function loadNews() {
  const { data, error } = await supabase
    .from('news_updated')
    .select('*')
    .eq('id', newsId)
    .single()

  if (error || !data) {
    toast.add({ title: 'Berita tidak ditemukan', color: 'error' })
    router.push('/news')
    return
  }

  originalData.value = data

  form.title = data.title
  form.sub_title = data.sub_title ?? ''
  form.category = data.category
  form.status_news = data.status_news
  form.slug = data.slug ?? ''
  form.link = data.link ?? ''

  if (data.content && typeof data.content === 'object') {
    content.value = data.content as Record<string, any>
  }

  if (data.cover_image) {
    originalCoverUrl.value = data.cover_image
    coverPreview.value = getNewsPublicUrl(data.cover_image)
  }

  if (data.images) {
    const imgs = data.images as string[]
    existingGalleryUrls.value = imgs.map(u => getNewsPublicUrl(u) ?? u)
  }

  if (data.attachments) {
    existingAttachments.value = data.attachments as AttachmentItem[]
  }

  pending.value = false
}

// ─── Categories ───────────────────────────────────────────────────────────────
async function fetchCategories() {
  const { data } = await supabase
    .from('category_news')
    .select('*')
    .is('deleted_at', null)
    .order('name')
  categories.value = data ?? []
}

// ─── Cover image ─────────────────────────────────────────────────────────────
const slugEdited = ref<boolean>(false)
function onTitleInput() {
  if (!slugEdited.value && form.title && !originalData.value?.slug) {
    form.slug = slugify(form.title)
  }
}

watch(coverFile, (file) => {
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: 'File terlalu besar', description: 'Maksimal 5MB', color: 'error' })
    coverFile.value = null
    return
  }
  coverPreview.value = URL.createObjectURL(file)
})

function removeCover() {
  coverFile.value = null
  coverPreview.value = null
  originalCoverUrl.value = null
}

// ─── Gallery ─────────────────────────────────────────────────────────────────
function addGalleryFiles(files: File | File[] | null) {
  const list = Array.isArray(files) ? files : files ? [files] : []
  const valid = list.filter(f => f.size <= 5 * 1024 * 1024)
  if (valid.length < list.length) {
    toast.add({ title: 'Beberapa file diabaikan', description: 'Ukuran > 5MB', color: 'warning' })
  }
  galleryFiles.value.push(...valid)
  for (const file of valid) {
    newGalleryPreviews.value.push(URL.createObjectURL(file))
  }
}

function removeExistingGallery(idx: number) {
  existingGalleryUrls.value.splice(idx, 1)
}

function removeNewGallery(idx: number) {
  galleryFiles.value.splice(idx, 1)
  newGalleryPreviews.value.splice(idx, 1)
}

// ─── Attachments ─────────────────────────────────────────────────────────────
async function uploadAttachments(): Promise<AttachmentItem[]> {
  const items: AttachmentItem[] = []
  for (const file of newAttachmentFiles.value) {
    const url = await uploadNewsFile('attachments', newsId, file)
    items.push({ url, name: file.name, type: file.type, size: file.size })
  }
  return items
}

// ─── Submit ───────────────────────────────────────────────────────────────────
async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  uploading.value = true
  try {
    // Upload new cover if changed
    let coverUrl: string | null = originalCoverUrl.value
    if (coverFile.value) {
      // Delete old cover if it was in our storage
      if (originalData.value?.cover_image) {
        await deleteNewsFile(originalData.value.cover_image).catch(() => null)
      }
      coverUrl = await uploadNewsFile('images', newsId, coverFile.value)
    } else if (!coverPreview.value) {
      coverUrl = null
    }

    // Upload new gallery files
    const uploadedGallery: string[] = []
    for (const file of galleryFiles.value) {
      const url = await uploadNewsFile('gallery', newsId, file)
      uploadedGallery.push(url)
    }

    // Upload new attachments
    const uploadedAttachments = await uploadAttachments()
    uploading.value = false

    const allGalleryUrls = [...existingGalleryUrls.value, ...uploadedGallery]
    const allAttachments = [...existingAttachments.value, ...uploadedAttachments]

    const wasApproved = originalData.value?.status_news === 'approved'
    const nowApproved = event.data.status_news === 'approved'
    const published_at = nowApproved && !wasApproved
      ? new Date().toISOString()
      : originalData.value?.published_at ?? null

    const { error } = await supabase.from('news_updated').update({
      title: event.data.title,
      sub_title: event.data.sub_title || null,
      category: event.data.category,
      status_news: event.data.status_news,
      slug: event.data.slug || slugify(event.data.title),
      link: event.data.link || null,
      content: content.value ?? {},
      cover_image: coverUrl,
      images: allGalleryUrls.length > 0 ? allGalleryUrls : null,
      attachments: allAttachments.length > 0 ? allAttachments : null,
      published_at,
      updated_at: new Date().toISOString()
    }).eq('id', newsId)

    if (error) throw error

    toast.add({ title: 'Berita berhasil diperbarui', color: 'success' })
    router.push('/news')
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err.message, color: 'error' })
  } finally {
    saving.value = false
    uploading.value = false
  }
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
watch(newGalleryInput, (files) => {
  if (!files || files.length === 0) return
  addGalleryFiles(files)
  newGalleryInput.value = []
})

// Watch newAttachmentInput to queue files for upload
watch(newAttachmentInput, (files) => {
  if (!files || files.length === 0) return
  newAttachmentFiles.value.push(...files)
  newAttachmentInput.value = []
})

onMounted(() => {
  fetchCategories()
  loadNews()
})
</script>

<template>
  <UDashboardPanel id="news-edit">
    <template #header>
      <UDashboardNavbar title="Edit Berita">
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
          <UBadge
            v-if="originalData?.slug"
            :to="`/news/preview/${originalData.slug}`"
            color="neutral"
            variant="soft"
            trailing-icon="i-lucide-external-link"
          >
            Preview
          </UBadge>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <!-- Loading skeleton -->
      <div v-if="pending" class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <UPageCard>
            <div class="space-y-4">
              <USkeleton class="h-10 w-full" />
              <USkeleton class="h-10 w-full" />
              <USkeleton class="h-10 w-full" />
            </div>
          </UPageCard>
          <UPageCard>
            <USkeleton class="h-96 w-full" />
          </UPageCard>
        </div>
        <div class="space-y-6">
          <UPageCard>
            <USkeleton class="h-48 w-full" />
          </UPageCard>
        </div>
      </div>

      <!-- Form -->
      <UForm
        v-else
        :schema="schema"
        :state="form"
        class="h-full"
        @submit="onSubmit"
      >
        <div class="grid lg:grid-cols-3 gap-6">
          <!-- ── Main column ─────────────────────────────────────────── -->
          <div class="lg:col-span-2 space-y-6">
            <UPageCard title="Informasi Artikel">
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

            <UPageCard title="Konten">
              <div class="border border-muted rounded-lg overflow-hidden min-h-96">
                <UEditor
                  v-slot="{ editor }"
                  v-model="content"
                  content-type="json"
                  :extensions="editorExtensions"
                  :handlers="(editorHandlers as any)"
                  placeholder="Tulis konten artikel..."
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

                <div
                  v-if="originalData?.published_at"
                  class="text-xs text-muted"
                >
                  Dipublikasikan: {{ new Date(originalData.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }}
                </div>
              </div>

              <div class="flex gap-2 mt-6">
                <UButton
                  type="submit"
                  class="flex-1"
                  :loading="saving"
                >
                  {{ saving ? (uploading ? 'Mengunggah...' : 'Menyimpan...') : 'Perbarui' }}
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
                  <img :src="coverPreview" class="size-full object-cover" alt="Cover">
                  <UButton
                    icon="i-lucide-x"
                    color="error"
                    variant="solid"
                    size="xs"
                    class="absolute top-2 right-2"
                    @click="removeCover"
                  />
                </div>
                <UFileUpload
                  v-else
                  v-model="coverFile"
                  accept="image/*"
                  label="Upload cover baru"
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
                  v-if="existingGalleryUrls.length > 0 || newGalleryPreviews.length > 0"
                  class="grid grid-cols-3 gap-2"
                >
                  <div
                    v-for="(url, idx) in existingGalleryUrls"
                    :key="`existing-${idx}`"
                    class="relative rounded-md overflow-hidden aspect-square bg-muted group"
                  >
                    <img :src="url" class="size-full object-cover" alt="">
                    <button
                      class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      @click="removeExistingGallery(idx)"
                    >
                      <UIcon name="i-lucide-trash-2" class="size-5 text-white" />
                    </button>
                  </div>
                  <div
                    v-for="(url, idx) in newGalleryPreviews"
                    :key="`new-${idx}`"
                    class="relative rounded-md overflow-hidden aspect-square bg-muted group ring-2 ring-primary"
                  >
                    <img :src="url" class="size-full object-cover" alt="">
                    <button
                      class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      @click="removeNewGallery(idx)"
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
                <!-- Existing attachments -->
                <div v-if="existingAttachments.length > 0" class="space-y-1.5">
                  <div
                    v-for="(att, idx) in existingAttachments"
                    :key="`att-${idx}`"
                    class="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-elevated/50"
                  >
                    <UIcon name="i-lucide-paperclip" class="size-4 text-muted shrink-0" />
                    <a :href="att.url" target="_blank" class="flex-1 truncate text-highlighted hover:underline">{{ att.name }}</a>
                    <span class="text-xs text-muted">{{ (att.size / 1024).toFixed(0) }} KB</span>
                    <UButton
                      icon="i-lucide-x"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      @click="existingAttachments.splice(idx, 1)"
                    />
                  </div>
                </div>
                <!-- New attachments to upload -->
                <div v-if="newAttachmentFiles.length > 0" class="space-y-1.5">
                  <div
                    v-for="(file, idx) in newAttachmentFiles"
                    :key="`new-att-${idx}`"
                    class="flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-primary/5 ring-1 ring-primary/20"
                  >
                    <UIcon name="i-lucide-paperclip" class="size-4 text-primary shrink-0" />
                    <span class="flex-1 truncate text-highlighted">{{ file.name }}</span>
                    <span class="text-xs text-muted">{{ (file.size / 1024).toFixed(0) }} KB</span>
                    <UButton
                      icon="i-lucide-x"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      @click="newAttachmentFiles.splice(idx, 1)"
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
