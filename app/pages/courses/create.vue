<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, EditorSuggestionMenuItem } from '@nuxt/ui'

useHead({ title: 'Buat Course – Jurutani Admin' })

const supabase = useSupabase()
const toast = useToast()
const router = useRouter()

const DRAFT_KEY = 'course_draft_create'

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(200),
  slug: z.string().min(1, 'Slug wajib diisi').max(200).regex(/^[a-z0-9-]+$/, 'Hanya huruf kecil, angka, dan tanda -'),
  category: z.string().min(1, 'Kategori wajib dipilih'),
  status: z.string()
})

type Schema = z.output<typeof schema>

// ─── State ───────────────────────────────────────────────────────────────────
const form = reactive<Schema>({
  title: '',
  slug: '',
  category: '',
  status: 'pending'
})

const publishedAt = ref<string | null>(null)
const description = ref<Record<string, any> | null>(null)
const coverFile = ref<File | null>(null)
const coverPreview = ref<string | null>(null)
const saving = ref(false)
const slugEdited = ref(false)

// ─── Auto-slug ────────────────────────────────────────────────────────────────
function onTitleInput() {
  if (!slugEdited.value && form.title) {
    form.slug = slugify(form.title)
  }
}

// ─── Autosave ─────────────────────────────────────────────────────────────────
const autosaveLabel = ref('')

watchDebounced([form, publishedAt, description], () => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      form: { ...form },
      publishedAt: publishedAt.value,
      description: description.value
    }))
    autosaveLabel.value = `Draft tersimpan ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
  } catch {}
}, { debounce: 3000, deep: true })

// Restore draft on mount
onMounted(() => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (saved.form?.title) {
      Object.assign(form, saved.form)
      publishedAt.value = saved.publishedAt ?? null
      if (saved.description) description.value = saved.description
      autosaveLabel.value = 'Draft dipulihkan dari penyimpanan lokal'
    }
  } catch {}
})

// ─── Cover image ─────────────────────────────────────────────────────────────
watch(coverFile, (file) => {
  if (!file) { coverPreview.value = null; return }
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ title: 'File terlalu besar', description: 'Maksimal 5MB', color: 'error' })
    coverFile.value = null
    return
  }
  coverPreview.value = URL.createObjectURL(file)
})

// ─── Submit ───────────────────────────────────────────────────────────────────
async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  try {
    const { data: { user } } = await supabase.auth.getUser()

    // Pre-generate ID so we can upload cover with it
    const tempId = crypto.randomUUID()

    let coverUrl: string | null = null
    if (coverFile.value) {
      coverUrl = await uploadCourseFile('covers', tempId, coverFile.value)
    }

    const published_at = event.data.status === 'approved'
      ? (publishedAt.value ?? new Date().toISOString())
      : (publishedAt.value ?? null)

    const { data: inserted, error } = await supabase
      .from('learning_courses')
      .insert({
        title: event.data.title,
        slug: event.data.slug,
        category: event.data.category,
        status: event.data.status,
        description: description.value ?? {},
        cover_image: coverUrl,
        author_id: user?.id ?? null,
        published_at
      })
      .select('id')
      .single()

    if (error) throw error

    localStorage.removeItem(DRAFT_KEY)
    toast.add({ title: 'Course berhasil dibuat', color: 'success' })
    router.push(`/courses/${inserted.id}/lessons`)
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

// ─── Editor ───────────────────────────────────────────────────────────────────
const toolbarItems = [
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

const categoryItems = Enum.CourseCategories.map(c => ({ label: c.label, value: c.value }))
</script>

<template>
  <UDashboardPanel id="courses-create">
    <template #header>
      <UDashboardNavbar title="Buat Course Baru">
        <template #leading>
          <UButton
            to="/courses"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </template>
        <template #right>
          <span v-if="autosaveLabel" class="text-xs text-muted hidden sm:block">{{ autosaveLabel }}</span>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UForm :schema="schema" :state="form" class="h-full" @submit="onSubmit">
        <div class="grid lg:grid-cols-3 gap-6">
          <!-- ── Main column ──────────────────────────────────────────── -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Course Info -->
            <UPageCard title="Informasi Course" description="Judul dan slug akan tampil di URL publik.">
              <div class="space-y-4">
                <UFormField name="title" label="Judul *">
                  <UInput
                    v-model="form.title"
                    placeholder="Contoh: Budidaya Padi Organik untuk Pemula"
                    class="w-full"
                    @input="onTitleInput"
                  />
                </UFormField>

                <UFormField name="slug" label="Slug URL">
                  <UInput
                    v-model="form.slug"
                    placeholder="budidaya-padi-organik"
                    class="w-full font-mono text-sm"
                    @input="slugEdited = true"
                  />
                  <template #hint>
                    <span class="text-xs text-muted">
                      /courses/<span class="text-highlighted font-mono">{{ form.slug || 'slug-course' }}</span>
                    </span>
                  </template>
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
            </UPageCard>

            <!-- Description editor -->
            <UPageCard title="Deskripsi" description="Pengantar dan overview course untuk calon peserta.">
              <div class="border border-muted rounded-lg overflow-hidden min-h-64">
                <UEditor
                  v-slot="{ editor }"
                  v-model="description"
                  content-type="json"
                  placeholder="Tuliskan deskripsi course, tujuan pembelajaran, dan siapa yang cocok mengikuti course ini..."
                  class="min-h-60"
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

            <!-- Cover image -->
            <UPageCard title="Gambar Cover" description="Thumbnail yang muncul di halaman daftar course.">
              <div class="space-y-3">
                <div v-if="coverPreview" class="relative rounded-lg overflow-hidden aspect-video bg-muted">
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
                  label="Upload cover course"
                  description="PNG, JPG, WebP · maks 5MB · rasio 16:9 direkomendasikan"
                  :preview="false"
                >
                  <template #leading>
                    <UIcon name="i-lucide-image" class="size-7 text-muted" />
                  </template>
                </UFileUpload>
              </div>
            </UPageCard>
          </div>

          <!-- ── Sidebar ─────────────────────────────────────────────── -->
          <div>
            <CoursesPublishPanel
              v-model:status="form.status"
              v-model:published-at="publishedAt"
              :loading="saving"
            />
          </div>
        </div>
      </UForm>
    </template>
  </UDashboardPanel>
</template>
