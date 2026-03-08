<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, EditorSuggestionMenuItem } from '@nuxt/ui'

const route = useRoute()
const courseId = route.params.id as string

useHead({ title: 'Edit Course – Jurutani Admin' })

const supabase = useSupabase()
const toast = useToast()
const router = useRouter()

const DRAFT_KEY = `course_draft_${courseId}`

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
const existingCoverUrl = ref<string | null>(null)
const saving = ref(false)
const slugEdited = ref(true)
const autosaveLabel = ref('')
const lessonCount = ref(0)

// ─── Load course ──────────────────────────────────────────────────────────────
const { data: course, error: loadError } = await useAsyncData(`course-edit-${courseId}`, async () => {
  const { data, error } = await supabase
    .from('learning_courses')
    .select('*, lessons:course_lessons(count)')
    .eq('id', courseId)
    .is('deleted_at', null)
    .single()
  if (error) throw error
  return data
})

if (loadError.value || !course.value) {
  await navigateTo('/courses')
}

// Populate form from DB
watchEffect(() => {
  const c = course.value
  if (!c) return
  form.title = c.title
  form.slug = c.slug ?? ''
  form.category = c.category ?? ''
  form.status = c.status
  publishedAt.value = c.published_at ?? null
  description.value = (c.description as any) ?? null
  existingCoverUrl.value = c.cover_image ?? null
  lessonCount.value = (c as any).lessons?.[0]?.count ?? 0
  // Check for unsaved local draft
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved.form?.title) {
        Object.assign(form, saved.form)
        publishedAt.value = saved.publishedAt ?? null
        if (saved.description) description.value = saved.description
        autosaveLabel.value = 'Draft lokal dipulihkan — simpan untuk konfirmasi'
      }
    }
  } catch {}
}, { flush: 'sync' })

// ─── Auto-slug ────────────────────────────────────────────────────────────────
function onTitleInput() {
  if (!slugEdited.value && form.title) {
    form.slug = slugify(form.title)
  }
}

// ─── Autosave ─────────────────────────────────────────────────────────────────
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

// ─── Cover image ─────────────────────────────────────────────────────────────
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
  existingCoverUrl.value = null
}

// ─── Submit ───────────────────────────────────────────────────────────────────
async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  try {
    let coverUrl: string | null = existingCoverUrl.value

    if (coverFile.value) {
      coverUrl = await uploadCourseFile('covers', courseId, coverFile.value)
    }

    const published_at = event.data.status === 'approved'
      ? (publishedAt.value ?? course.value?.published_at ?? new Date().toISOString())
      : (publishedAt.value ?? null)

    const { error } = await supabase
      .from('learning_courses')
      .update({
        title: event.data.title,
        slug: event.data.slug,
        category: event.data.category,
        status: event.data.status,
        description: description.value ?? {},
        cover_image: coverUrl,
        published_at
      })
      .eq('id', courseId)

    if (error) throw error

    localStorage.removeItem(DRAFT_KEY)
    toast.add({ title: 'Course berhasil diperbarui', color: 'success' })
    autosaveLabel.value = ''
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
const displayCoverUrl = computed(() => coverPreview.value ?? getCoursePublicUrl(existingCoverUrl.value))
</script>

<template>
  <UDashboardPanel id="courses-edit">
    <template #header>
      <UDashboardNavbar :title="`Edit: ${course?.title ?? '...'}`">
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
            <UPageCard title="Informasi Course">
              <div class="space-y-4">
                <UFormField name="title" label="Judul *">
                  <UInput
                    v-model="form.title"
                    placeholder="Judul course..."
                    class="w-full"
                    @input="onTitleInput"
                  />
                </UFormField>

                <UFormField name="slug" label="Slug URL">
                  <UInput
                    v-model="form.slug"
                    placeholder="slug-course"
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

            <UPageCard title="Deskripsi">
              <div class="border border-muted rounded-lg overflow-hidden min-h-64">
                <UEditor
                  v-slot="{ editor }"
                  v-model="description"
                  content-type="json"
                  placeholder="Deskripsi course..."
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

            <UPageCard title="Gambar Cover">
              <div class="space-y-3">
                <div v-if="displayCoverUrl" class="relative rounded-lg overflow-hidden aspect-video bg-muted">
                  <img :src="displayCoverUrl" class="size-full object-cover" alt="Cover preview">
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
                  label="Upload cover course"
                  description="PNG, JPG, WebP · maks 5MB"
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
              :course-id="courseId"
              :lesson-count="lessonCount"
            />
          </div>
        </div>
      </UForm>
    </template>
  </UDashboardPanel>
</template>
