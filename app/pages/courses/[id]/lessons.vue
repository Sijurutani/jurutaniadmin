<script setup lang="ts">
import { z } from 'zod'
import type { EmbedItem } from '~/utils/embed'

const route = useRoute()
const courseId = route.params.id as string

useHead({ title: 'Kelola Lesson – Jurutani Admin' })

const supabase = useSupabaseClient()
const toast = useToast()

// ─── Course meta ──────────────────────────────────────────────────────────────
const { data: course } = await useAsyncData(`lesson-manager-course-${courseId}`, async () => {
  const { data } = await supabase
    .from('learning_courses')
    .select('id, title, status')
    .eq('id', courseId)
    .single()
  return data
}, { server: false })

if (import.meta.client && !course.value) { await navigateTo('/courses') }

// ─── Lesson list (metadata only) ─────────────────────────────────────────────
interface LessonMeta {
  id: string
  title: string
  slug: string
  status: string
  published_at: string | null
  order_index: number
}

const lessons = ref<LessonMeta[]>([])
const loadingList = ref(false)

async function fetchLessons() {
  loadingList.value = true
  const { data } = await supabase
    .from('course_lessons')
    .select('id, title, slug, status, published_at, order_index')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('order_index')
  lessons.value = (data ?? []) as LessonMeta[]
  loadingList.value = false
}

await fetchLessons()

// ─── Drag & drop reorder (native HTML5) ──────────────────────────────────────
const dragSourceIdx = ref<number | null>(null)
const dragOverIdx = ref<number | null>(null)

function onDragStart(idx: number) {
  dragSourceIdx.value = idx
}

function onDragOver(idx: number) {
  dragOverIdx.value = idx
}

function onDrop(idx: number) {
  const src = dragSourceIdx.value
  if (src === null || src === idx) { dragSourceIdx.value = null; dragOverIdx.value = null; return }
  const moved = lessons.value.splice(src, 1)[0]!
  lessons.value.splice(idx, 0, moved)
  dragSourceIdx.value = null
  dragOverIdx.value = null
  saveOrder()
}

async function saveOrder() {
  const updates = lessons.value.map((l, i) => ({ id: l.id, order_index: i }))
  for (const u of updates) {
    await supabase.from('course_lessons').update({ order_index: u.order_index }).eq('id', u.id)
  }
}

// ─── Active lesson (right panel) ─────────────────────────────────────────────
interface LessonFull extends LessonMeta {
  content: Record<string, any> | null
  embeds: EmbedItem[]
}

// TipTap JSON validator – only a ProseMirror doc with `type: 'doc'` is valid
function isValidTiptapDoc(content: unknown): boolean {
  return !!(content && typeof content === 'object' && (content as any).type === 'doc')
}

const activeLesson = ref<LessonFull | null>(null)
const loadingLesson = ref(false)
const unsavedChanges = ref(false)

async function selectLesson(lesson: LessonMeta) {
  if (activeLesson.value?.id === lesson.id) return
  loadingLesson.value = true
  activeLesson.value = null

  // Check for local draft first
  const DRAFT_KEY = `lesson_draft_${lesson.id}`
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      const draftContent = isValidTiptapDoc(saved.content) ? saved.content : null
      activeLesson.value = { ...lesson, content: draftContent, embeds: saved.embeds ?? [] }
      Object.assign(lessonForm, saved.form ?? {})
      lessonForm.title = saved.form?.title ?? lesson.title
      lessonForm.slug = saved.form?.slug ?? lesson.slug
      lessonForm.status = saved.form?.status ?? lesson.status
      lessonContent.value = draftContent
      lessonEmbeds.value = saved.embeds ?? []
      unsavedChanges.value = true
      loadingLesson.value = false
      return
    }
  } catch {}

  // Fetch full lesson from DB
  const { data } = await supabase
    .from('course_lessons')
    .select('id, title, slug, status, published_at, order_index, content, embeds')
    .eq('id', lesson.id)
    .single()

  if (data) {
    activeLesson.value = {
      ...lesson,
      content: isValidTiptapDoc(data.content) ? (data.content as any) : null,
      embeds: (data.embeds as any) ?? []
    }
    lessonForm.title = data.title
    lessonForm.slug = data.slug
    lessonForm.status = data.status
    lessonEmbeds.value = (data.embeds as any) ?? []
    lessonContent.value = isValidTiptapDoc(data.content) ? (data.content as any) : null
  }
  unsavedChanges.value = false
  loadingLesson.value = false
}

// ─── Lesson form state ────────────────────────────────────────────────────────
const lessonSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi').max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Hanya huruf kecil, angka, dan tanda -'),
  status: z.string()
})

type LessonSchema = z.output<typeof lessonSchema>

const lessonForm = reactive<LessonSchema>({
  title: '',
  slug: '',
  status: 'pending'
})

const lessonContent = ref<Record<string, any> | null>(null)
const lessonEmbeds = ref<EmbedItem[]>([])
const slugEdited = ref(false)
const savingLesson = ref(false)

function onLessonTitleInput() {
  if (!slugEdited.value) {
    lessonForm.slug = slugify(lessonForm.title)
  }
}

// ─── Autosave lesson draft ────────────────────────────────────────────────────
watchDebounced([lessonForm, lessonContent, lessonEmbeds], () => {
  if (!activeLesson.value) return
  const key = `lesson_draft_${activeLesson.value.id}`
  try {
    localStorage.setItem(key, JSON.stringify({
      form: { ...lessonForm },
      content: lessonContent.value,
      embeds: lessonEmbeds.value
    }))
    unsavedChanges.value = true
  } catch {}
}, { debounce: 3000, deep: true })

// ─── Save lesson ──────────────────────────────────────────────────────────────
async function saveLesson() {
  if (!activeLesson.value) return
  const parsed = lessonSchema.safeParse(lessonForm)
  if (!parsed.success) {
    toast.add({ title: 'Validasi gagal', description: parsed.error.issues[0]?.message, color: 'error' })
    return
  }

  savingLesson.value = true
  try {
    const currentLesson = lessons.value.find(l => l.id === activeLesson.value!.id)
    const published_at = lessonForm.status === 'approved'
      ? (currentLesson?.published_at ?? new Date().toISOString())
      : null

    const { error } = await supabase
      .from('course_lessons')
      .update({
        title: lessonForm.title,
        slug: lessonForm.slug,
        status: lessonForm.status,
        content: lessonContent.value ?? {},
        embeds: lessonEmbeds.value,
        published_at
      })
      .eq('id', activeLesson.value.id)

    if (error) throw error

    // Update local list metadata
    const idx = lessons.value.findIndex(l => l.id === activeLesson.value!.id)
    if (idx >= 0) {
      lessons.value[idx] = {
        ...lessons.value[idx]!,
        title: lessonForm.title,
        slug: lessonForm.slug,
        status: lessonForm.status,
        published_at: published_at
      }
    }

    localStorage.removeItem(`lesson_draft_${activeLesson.value.id}`)
    unsavedChanges.value = false
    toast.add({ title: 'Lesson tersimpan', color: 'success', duration: 2000 })
  } catch (err: any) {
    toast.add({ title: 'Gagal menyimpan', description: err.message, color: 'error' })
  } finally {
    savingLesson.value = false
  }
}

// ─── Add new lesson ───────────────────────────────────────────────────────────
const addingLesson = ref(false)
const newLessonTitle = ref('')
const newLessonSlug = ref('')
const addLessonOpen = ref(false)
const slugManuallyEdited = ref(false)

watch(newLessonTitle, (val) => {
  if (!slugManuallyEdited.value) {
    newLessonSlug.value = slugify(val)
  }
})

function openAddLesson() {
  newLessonTitle.value = ''
  newLessonSlug.value = ''
  slugManuallyEdited.value = false
  addLessonOpen.value = true
}

async function addLesson() {
  const title = newLessonTitle.value.trim()
  const slug = newLessonSlug.value.trim() || slugify(title)
  if (!title) return

  // Check slug conflict within this course
  const existing = lessons.value.find(l => l.slug === slug)
  const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug

  addingLesson.value = true
  try {
    const { data, error } = await supabase
      .from('course_lessons')
      .insert({
        course_id: courseId,
        title,
        slug: finalSlug,
        order_index: lessons.value.length,
        status: 'pending',
        content: {},
        embeds: []
      })
      .select('id, title, slug, status, published_at, order_index')
      .single()

    if (error) throw error

    lessons.value.push(data as LessonMeta)
    newLessonTitle.value = ''
    newLessonSlug.value = ''
    slugManuallyEdited.value = false
    addLessonOpen.value = false
    toast.add({ title: 'Lesson ditambahkan', color: 'success', duration: 2000 })
    await selectLesson(data as LessonMeta)
  } catch (err: any) {
    toast.add({ title: 'Gagal menambah lesson', description: err.message, color: 'error' })
  } finally {
    addingLesson.value = false
  }
}

// ─── Delete lesson ────────────────────────────────────────────────────────────
const deleteLessonTarget = ref<LessonMeta | null>(null)
const deleteLessonOpen = ref(false)
const deletingLesson = ref(false)

function openDeleteLesson(lesson: LessonMeta) {
  deleteLessonTarget.value = lesson
  deleteLessonOpen.value = true
}

async function confirmDeleteLesson() {
  if (!deleteLessonTarget.value) return
  deletingLesson.value = true
  try {
    const { error } = await supabase
      .from('course_lessons')
      .delete()
      .eq('id', deleteLessonTarget.value.id)

    if (error) throw error

    lessons.value = lessons.value.filter(l => l.id !== deleteLessonTarget.value!.id)
    if (activeLesson.value?.id === deleteLessonTarget.value.id) {
      activeLesson.value = null
    }
    deleteLessonOpen.value = false
    deleteLessonTarget.value = null
    toast.add({ title: 'Lesson dihapus', color: 'success', duration: 2000 })
  } catch (err: any) {
    toast.add({ title: 'Gagal menghapus', description: err.message, color: 'error' })
  } finally {
    deletingLesson.value = false
  }
}

const statusItems = Enum.StatusLearning.map(s => ({ label: s.label, value: s.value }))
const lessonEmbedPlatformOptions = Enum.LessonEmbedPlatforms.map(p => ({ label: p.label, value: p.value }))

// Detect lesson embed platform from URL
const lessonEmbedUrl = ref('')
const lessonEmbedPlatform = ref('')
const lessonEmbedError = ref('')

watch(lessonEmbedUrl, (val) => {
  lessonEmbedError.value = ''
  if (!val) { lessonEmbedPlatform.value = ''; return }
  // Simple detection for lesson platforms
  if (val.includes('youtube.com') || val.includes('youtu.be')) {
    lessonEmbedPlatform.value = 'youtube'
  } else if (val.includes('/document/d/')) {
    lessonEmbedPlatform.value = 'gdrive_doc'
  } else if (val.includes('/spreadsheets/d/')) {
    lessonEmbedPlatform.value = 'gdrive_sheet'
  } else if (val.includes('/presentation/d/')) {
    lessonEmbedPlatform.value = 'gdrive_slide'
  } else if (val.includes('drive.google.com/file/')) {
    lessonEmbedPlatform.value = val.toLowerCase().includes('.pdf') ? 'gdrive_pdf' : 'gdrive_video'
  } else {
    lessonEmbedPlatform.value = ''
  }
})

function addLessonEmbed() {
  const url = lessonEmbedUrl.value.trim()
  if (!url) { lessonEmbedError.value = 'URL wajib diisi'; return }
  try { new URL(url) } catch { lessonEmbedError.value = 'URL tidak valid'; return }
  if (!lessonEmbedPlatform.value) { lessonEmbedError.value = 'Pilih platform'; return }

  lessonEmbeds.value = [...lessonEmbeds.value, {
    id: crypto.randomUUID(),
    platform: lessonEmbedPlatform.value,
    url,
    order: lessonEmbeds.value.length
  }]
  lessonEmbedUrl.value = ''
  lessonEmbedPlatform.value = ''
  lessonEmbedError.value = ''
}

function removeLessonEmbed(id: string) {
  lessonEmbeds.value = lessonEmbeds.value.filter(e => e.id !== id).map((e, i) => ({ ...e, order: i }))
}
</script>

<template>
  <UDashboardPanel id="courses-lessons">
    <template #header>
      <UDashboardNavbar :title="`Lesson: ${course?.title ?? '...'}`">
        <template #leading>
          <UButton
            :to="`/courses/${courseId}/edit`"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </template>
        <template #right>
          <UButton
            :to="`/courses/${courseId}/preview`"
            icon="i-lucide-eye"
            color="neutral"
            variant="outline"
            label="Preview"
            size="sm"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid lg:grid-cols-[280px_1fr] gap-0 h-full min-h-[calc(100vh-8rem)]">
        <!-- ── Left: Lesson List ───────────────────────────────────────── -->
        <div class="border-r border-default flex flex-col">
          <div class="p-3 border-b border-default flex items-center justify-between">
            <span class="text-sm font-semibold text-highlighted">
              {{ lessons.length }} Lesson
            </span>
            <UButton
              icon="i-lucide-plus"
              size="xs"
              label="Tambah"
              @click="openAddLesson"
            />
          </div>

          <div
            v-if="loadingList"
            class="p-3 space-y-2"
          >
            <USkeleton v-for="i in 4" :key="i" class="h-10 rounded-lg" />
          </div>

          <div
            v-else-if="lessons.length === 0"
            class="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center"
          >
            <UIcon name="i-lucide-layers" class="size-8 text-muted" />
            <p class="text-sm text-muted">
              Belum ada lesson.
            </p>
            <UButton size="xs" label="Tambah Lesson Pertama" @click="addLessonOpen = true" />
          </div>

          <div v-else class="flex-1 p-2 space-y-1 overflow-y-auto">
            <div
              v-for="(lesson, idx) in lessons"
              :key="lesson.id"
              draggable="true"
              :class="{ 'opacity-50': dragSourceIdx === idx, 'ring-2 ring-primary ring-inset rounded-lg': dragOverIdx === idx && dragOverIdx !== dragSourceIdx }"
              @dragstart="onDragStart(idx)"
              @dragover.prevent="onDragOver(idx)"
              @drop="onDrop(idx)"
              @dragend="dragSourceIdx = null; dragOverIdx = null"
            >
              <CoursesLessonListItem
                :lesson="lesson"
                :index="idx"
                :active="activeLesson?.id === lesson.id"
                @select="selectLesson(lesson)"
                @delete="openDeleteLesson(lesson)"
              />
            </div>
          </div>
        </div>

        <!-- ── Right: Lesson Editor ───────────────────────────────────── -->
        <div class="flex flex-col">
          <!-- Empty state -->
          <div v-if="!activeLesson && !loadingLesson" class="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            <UIcon name="i-lucide-mouse-pointer-click" class="size-10 text-muted" />
            <p class="text-base font-medium text-highlighted">
              Pilih lesson untuk mengedit
            </p>
            <p class="text-sm text-muted">
              Klik salah satu lesson di sebelah kiri, atau tambah lesson baru.
            </p>
          </div>

          <!-- Loading skeleton -->
          <div v-else-if="loadingLesson" class="p-6 space-y-4">
            <USkeleton class="h-8 w-1/2 rounded" />
            <USkeleton class="h-6 w-1/3 rounded" />
            <USkeleton class="h-40 rounded-lg" />
            <USkeleton class="h-24 rounded-lg" />
          </div>

          <!-- Form -->
          <div v-else-if="activeLesson" :key="activeLesson.id" class="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">
            <!-- Header row -->
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <h3 class="font-semibold text-highlighted truncate max-w-sm">
                  {{ activeLesson.title }}
                </h3>
                <UBadge
                  v-if="unsavedChanges"
                  color="warning"
                  variant="soft"
                  size="sm"
                  label="Perubahan belum disimpan"
                />
              </div>
              <div class="flex items-center gap-2">
                <UButton
                  icon="i-lucide-eye"
                  label="Preview"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  :to="`/courses/${courseId}/lesson-preview/${activeLesson.id}`"
                />
                <UButton
                  icon="i-lucide-save"
                  label="Simpan"
                  :loading="savingLesson"
                  @click="saveLesson"
                />
              </div>
            </div>

            <!-- Title + Slug -->
            <UPageCard title="Informasi Lesson">
              <div class="space-y-3">
                <UFormField label="Judul *">
                  <UInput
                    v-model="lessonForm.title"
                    class="w-full"
                    @input="onLessonTitleInput"
                  />
                </UFormField>

                <UFormField label="Slug">
                  <UInput
                    v-model="lessonForm.slug"
                    class="w-full font-mono text-sm"
                    @input="slugEdited = true"
                  />
                </UFormField>

                <div>
                  <UFormField label="Status">
                    <USelect
                      v-model="lessonForm.status"
                      :items="statusItems"
                      class="w-full"
                    />
                  </UFormField>
                </div>
                <p class="text-xs text-muted">
                  <UIcon name="i-lucide-info" class="size-3 inline mr-1" />
                  Lesson hanya tampil jika status <strong>approved</strong>.
                </p>
              </div>
            </UPageCard>

            <!-- Content editor -->
            <UPageCard title="Konten Materi">
              <EditorRichEditor
                v-model="lessonContent"
                placeholder="Tulis materi lesson di sini..."
              />
            </UPageCard>

            <!-- Embeds -->
            <UPageCard title="Embed Media" description="YouTube dan Google Drive untuk materi pendukung.">
              <div class="space-y-3">
                <!-- Existing embeds -->
                <div v-if="lessonEmbeds.length > 0" class="space-y-2">
                  <div
                    v-for="(embed) in lessonEmbeds"
                    :key="embed.id"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg border border-default bg-elevated"
                  >
                    <UIcon
                      :name="Enum.LessonEmbedPlatforms.find(p => p.value === embed.platform)?.icon ?? 'i-lucide-globe'"
                      class="size-4 shrink-0 text-muted"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-medium text-highlighted">
                        {{ Enum.LessonEmbedPlatforms.find(p => p.value === embed.platform)?.label ?? embed.platform }}
                      </p>
                      <p class="text-xs text-muted truncate">
                        {{ embed.url }}
                      </p>
                    </div>
                    <UButton
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="ghost"
                      size="xs"
                      @click="removeLessonEmbed(embed.id)"
                    />
                  </div>
                </div>

                <!-- Add embed input -->
                <div class="space-y-2">
                  <UInput
                    v-model="lessonEmbedUrl"
                    placeholder="https://youtube.com/watch?v=... atau Google Drive link"
                    class="w-full"
                  />
                  <div class="flex gap-2">
                    <USelect
                      v-model="lessonEmbedPlatform"
                      :items="lessonEmbedPlatformOptions"
                      placeholder="Platform"
                      class="flex-1"
                    />
                    <UButton
                      icon="i-lucide-plus"
                      label="Tambah"
                      @click="addLessonEmbed"
                    />
                  </div>
                  <p v-if="lessonEmbedError" class="text-xs text-error-500">
                    {{ lessonEmbedError }}
                  </p>
                </div>
              </div>
            </UPageCard>

            <!-- Bottom save -->
            <div class="flex justify-end pb-4">
              <UButton
                icon="i-lucide-save"
                label="Simpan Lesson"
                :loading="savingLesson"
                @click="saveLesson"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Add lesson modal -->
  <UModal v-model:open="addLessonOpen" title="Tambah Lesson Baru">
    <template #body>
      <div class="space-y-3">
        <UFormField label="Judul Lesson">
          <UInput
            v-model="newLessonTitle"
            placeholder="Contoh: Pengenalan Alat dan Bahan"
            class="w-full"
            autofocus
            @keyup.enter="addLesson"
          />
        </UFormField>
        <UFormField label="Slug (URL)">
          <UInput
            v-model="newLessonSlug"
            placeholder="otomatis dari judul"
            class="w-full font-mono text-sm"
            @input="slugManuallyEdited = true"
          />
          <template #hint>
            <span class="text-xs text-muted">Digunakan sebagai ID URL lesson</span>
          </template>
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          label="Batal"
          @click="addLessonOpen = false"
        />
        <UButton
          label="Tambah"
          :loading="addingLesson"
          :disabled="!newLessonTitle.trim()"
          @click="addLesson"
        />
      </div>
    </template>
  </UModal>

  <!-- Delete lesson confirm -->
  <UModal v-model:open="deleteLessonOpen" title="Hapus Lesson?">
    <template #body>
      <p class="text-sm text-muted">
        Lesson <span class="font-semibold text-highlighted">{{ deleteLessonTarget?.title }}</span> akan dihapus permanen beserta semua progress dan komentar terkait.
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          label="Batal"
          @click="deleteLessonOpen = false"
        />
        <UButton
          color="error"
          label="Hapus"
          :loading="deletingLesson"
          @click="confirmDeleteLesson"
        />
      </div>
    </template>
  </UModal>
</template>
