<script setup lang="ts">
import type { EmbedItem } from '~/utils/embed'

const route = useRoute()
const courseId = route.params.id as string
const lessonIdParam = route.params.lessonId as string

useHead({ title: 'Preview Lesson – Jurutani Admin' })

const supabase = useSupabaseClient()

// ─── Course meta ──────────────────────────────────────────────────────────────
const { data: course } = await useAsyncData(`lesson-preview-course-${courseId}`, async () => {
  const { data } = await supabase
    .from('learning_courses')
    .select('id, title, status')
    .eq('id', courseId)
    .single()
  return data
}, { server: false })

if (import.meta.client && !course.value) { await navigateTo('/courses') }

// ─── Lesson list (left panel) ─────────────────────────────────────────────────
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

// ─── Active lesson ────────────────────────────────────────────────────────────
interface LessonFull extends LessonMeta {
  content: Record<string, any> | null
  embeds: EmbedItem[]
}

const activeLesson = ref<LessonFull | null>(null)
const loadingLesson = ref(false)

function isValidTiptapDoc(content: unknown): boolean {
  return !!(content && typeof content === 'object' && (content as any).type === 'doc')
}

async function selectLesson(lesson: LessonMeta) {
  if (activeLesson.value?.id === lesson.id) return
  loadingLesson.value = true
  activeLesson.value = null

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
  }
  loadingLesson.value = false
}

// Auto-select from URL param on mount
onMounted(async () => {
  if (lessonIdParam && lessons.value.length > 0) {
    const found = lessons.value.find(l => l.id === lessonIdParam)
    if (found) await selectLesson(found)
  } else if (lessons.value.length > 0) {
    await selectLesson(lessons.value[0]!)
  }
})

// ─── Update URL when lesson changes ──────────────────────────────────────────
const router = useRouter()

async function openLesson(lesson: LessonMeta) {
  router.replace(`/courses/${courseId}/lesson-preview/${lesson.id}`)
  await selectLesson(lesson)
}

const statusDot = (lesson: LessonMeta) => {
  switch (lesson.status) {
    case 'approved': return { icon: 'i-lucide-circle-check', cls: 'text-success-500' }
    case 'pending': return { icon: 'i-lucide-circle', cls: 'text-muted' }
    case 'rejected': return { icon: 'i-lucide-circle-x', cls: 'text-error-500' }
    case 'archived': return { icon: 'i-lucide-archive', cls: 'text-muted' }
    default: return { icon: 'i-lucide-circle', cls: 'text-muted' }
  }
}

// ─── Embed rendering ──────────────────────────────────────────────────────────
function getLessonEmbedSrc(embed: EmbedItem): string | null {
  try {
    const u = new URL(embed.url)
    switch (embed.platform) {
      case 'youtube': {
        let videoId: string | null = null
        if (u.hostname === 'youtu.be') videoId = u.pathname.slice(1).split('?')[0] ?? null
        else videoId = u.searchParams.get('v')
        if (videoId) return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
        break
      }
      case 'gdrive_doc': {
        const match = u.pathname.match(/\/document\/d\/([^/]+)/)
        if (match) return `https://docs.google.com/document/d/${match[1]}/preview`
        break
      }
      case 'gdrive_sheet': {
        const match = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/)
        if (match) return `https://docs.google.com/spreadsheets/d/${match[1]}/htmlview?widget=true&headers=false`
        break
      }
      case 'gdrive_slide': {
        const match = u.pathname.match(/\/presentation\/d\/([^/]+)/)
        if (match) return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`
        break
      }
      case 'gdrive_video':
      case 'gdrive_pdf': {
        // https://drive.google.com/file/d/{id}/view
        const match = u.pathname.match(/\/file\/d\/([^/]+)/)
        if (match) return `https://drive.google.com/file/d/${match[1]}/preview`
        break
      }
    }
  } catch {}
  return null
}

function getEmbedAspect(platform: string): string {
  switch (platform) {
    case 'youtube':
    case 'gdrive_slide':
    case 'gdrive_video':
      return 'aspect-video'
    case 'gdrive_pdf':
      return 'aspect-[3/4]'
    case 'gdrive_doc':
    case 'gdrive_sheet':
      return 'aspect-[4/3]'
    default:
      return 'aspect-video'
  }
}

function getEmbedHeight(platform: string): string {
  switch (platform) {
    case 'gdrive_pdf':
    case 'gdrive_doc':
      return 'min-h-[600px]'
    case 'gdrive_sheet':
      return 'min-h-[480px]'
    default:
      return ''
  }
}
</script>

<template>
  <UDashboardPanel id="courses-lesson-preview">
    <template #header>
      <UDashboardNavbar :title="`Preview: ${course?.title ?? '...'}`">
        <template #leading>
          <UButton
            :to="`/courses/${courseId}/lessons`"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </template>
        <template #right>
          <div class="flex gap-2">
            <UButton
              :to="`/courses/${courseId}/lessons`"
              icon="i-lucide-pencil"
              label="Edit Lesson"
              color="neutral"
              variant="outline"
              size="sm"
            />
            <UButton
              :to="`/courses/${courseId}/preview`"
              icon="i-lucide-layout-panel-top"
              label="Preview Course"
              size="sm"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="grid lg:grid-cols-[280px_1fr] gap-0 h-full min-h-[calc(100vh-8rem)]">
        <div class="border-r border-default flex flex-col">
          <div class="p-3 border-b border-default">
            <span class="text-sm font-semibold text-highlighted">
              {{ lessons.length }} Lesson
            </span>
          </div>

          <div v-if="loadingList" class="p-3 space-y-2">
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
          </div>

          <div v-else class="flex-1 p-2 space-y-1 overflow-y-auto">
            <div
              v-for="(lesson, idx) in lessons"
              :key="lesson.id"
              class="group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors border"
              :class="activeLesson?.id === lesson.id
                ? 'bg-primary-50 dark:bg-primary-950 border-primary-200 dark:border-primary-800'
                : 'hover:bg-elevated border-transparent'"
              @click="openLesson(lesson)"
            >
              <!-- Index -->
              <span class="text-xs font-mono text-muted w-5 shrink-0 text-center">{{ idx + 1 }}</span>

              <!-- Status dot -->
              <UIcon
                :name="statusDot(lesson).icon"
                class="size-3.5 shrink-0"
                :class="statusDot(lesson).cls"
              />

              <!-- Title + drip -->
              <div class="flex-1 min-w-0">
                <p
                  class="text-sm truncate"
                  :class="activeLesson?.id === lesson.id
                    ? 'font-semibold text-primary-600 dark:text-primary-400'
                    : 'text-highlighted'"
                >
                  {{ lesson.title }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Right: Lesson Content Viewer ──────────────────────────── -->
        <div class="flex flex-col overflow-y-auto">
          <!-- Empty state -->
          <div
            v-if="!activeLesson && !loadingLesson"
            class="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8"
          >
            <UIcon name="i-lucide-mouse-pointer-click" class="size-10 text-muted" />
            <p class="text-base font-medium text-highlighted">
              Pilih lesson untuk melihat preview
            </p>
            <p class="text-sm text-muted">
              Klik lesson di sebelah kiri.
            </p>
          </div>

          <!-- Loading -->
          <div v-else-if="loadingLesson" class="p-6 space-y-4">
            <USkeleton class="h-8 w-2/3 rounded" />
            <USkeleton class="h-5 w-1/4 rounded" />
            <USkeleton class="h-64 rounded-xl" />
            <USkeleton class="h-40 rounded-xl" />
          </div>

          <!-- Content viewer -->
          <div v-else-if="activeLesson" :key="activeLesson.id" class="flex-1 p-4 lg:p-8 space-y-8 max-w-4xl w-full mx-auto">
            <!-- ── Header ─────────────────────────────────────────────── -->
            <div class="space-y-2 pb-4 border-b border-default">
              <div class="flex items-center gap-2 flex-wrap">
                <UBadge
                  :label="Enum.StatusLearning.find(s => s.value === activeLesson!.status)?.label ?? activeLesson!.status"
                  :color="(Enum.StatusLearning.find(s => s.value === activeLesson!.status)?.color ?? 'neutral') as any"
                  variant="soft"
                  size="sm"
                />
                <span v-if="activeLesson.published_at" class="text-xs text-muted flex items-center gap-1">
                  <UIcon name="i-lucide-clock" class="size-3" />
                  Aktif sejak {{ new Date(activeLesson.published_at).toLocaleDateString('id-ID') }}
                </span>
              </div>
              <h1 class="text-2xl font-bold text-highlighted">
                {{ activeLesson.title }}
              </h1>
              <p class="text-xs text-muted font-mono">
                {{ activeLesson.slug }}
              </p>
            </div>

            <!-- ── Materi / Rich Text ──────────────────────────────────── -->
            <div>
              <h2 class="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                Materi
              </h2>
              <div
                v-if="activeLesson.content"
                class="rounded-xl border border-default bg-default overflow-hidden"
              >
                <UEditor
                  v-model="activeLesson.content"
                  content-type="json"
                  :editable="false"
                  class="prose dark:prose-invert max-w-none px-6 py-5"
                />
              </div>
              <div v-else class="rounded-xl border border-dashed border-default py-10 text-center">
                <UIcon name="i-lucide-file-text" class="size-8 text-muted mb-2" />
                <p class="text-sm text-muted">
                  Belum ada konten materi untuk lesson ini.
                </p>
              </div>
            </div>

            <!-- ── Embeds / Media ─────────────────────────────────────── -->
            <div v-if="activeLesson.embeds.length > 0">
              <h2 class="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                Media Tambahan ({{ activeLesson.embeds.length }})
              </h2>
              <div class="space-y-6">
                <div
                  v-for="(embed, idx) in activeLesson.embeds"
                  :key="embed.id"
                  class="rounded-xl border border-default bg-default overflow-hidden"
                >
                  <!-- Embed header -->
                  <div class="flex items-center gap-2 px-4 py-2.5 border-b border-default bg-elevated">
                    <UIcon
                      :name="Enum.LessonEmbedPlatforms.find(p => p.value === embed.platform)?.icon ?? 'i-lucide-globe'"
                      :class="['size-4 shrink-0', `text-${Enum.LessonEmbedPlatforms.find(p => p.value === embed.platform)?.color ?? 'neutral'}-500`]"
                    />
                    <span class="text-sm font-medium text-highlighted flex-1">
                      {{ Enum.LessonEmbedPlatforms.find(p => p.value === embed.platform)?.label ?? embed.platform }}
                      <span class="text-muted font-normal ml-1">· Media {{ idx + 1 }}</span>
                    </span>
                    <a
                      :href="embed.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-xs text-primary-500 hover:text-primary-400 flex items-center gap-1"
                    >
                      <UIcon name="i-lucide-external-link" class="size-3" />
                      Buka
                    </a>
                  </div>

                  <!-- Iframe embed (if embeddable) -->
                  <div
                    v-if="getLessonEmbedSrc(embed)"
                    :class="[getEmbedAspect(embed.platform), getEmbedHeight(embed.platform), 'relative w-full']"
                  >
                    <iframe
                      :src="getLessonEmbedSrc(embed)!"
                      :title="`${embed.platform} embed ${idx + 1}`"
                      class="absolute inset-0 w-full h-full border-0"
                      allowfullscreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      loading="lazy"
                    />
                  </div>

                  <!-- Non-embeddable fallback -->
                  <div v-else class="px-4 py-6 flex items-center gap-3">
                    <UIcon name="i-lucide-link" class="size-5 text-muted shrink-0" />
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-muted mb-1">
                        Konten ini tidak dapat ditampilkan langsung.
                      </p>
                      <a
                        :href="embed.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-sm text-primary-500 underline hover:text-primary-400 truncate block"
                      >
                        {{ embed.url }}
                      </a>
                    </div>
                    <UButton
                      :href="embed.url"
                      target="_blank"
                      label="Buka Link"
                      icon="i-lucide-external-link"
                      size="sm"
                      color="neutral"
                      variant="outline"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- ── Navigation footer ──────────────────────────────────── -->
            <div class="flex items-center justify-between pt-4 border-t border-default pb-6">
              <UButton
                v-if="lessons.findIndex(l => l.id === activeLesson!.id) > 0"
                icon="i-lucide-chevron-left"
                label="Sebelumnya"
                color="neutral"
                variant="outline"
                @click="openLesson(lessons[lessons.findIndex(l => l.id === activeLesson!.id) - 1]!)"
              />
              <div v-else />
              <span class="text-sm text-muted">
                {{ lessons.findIndex(l => l.id === activeLesson!.id) + 1 }} / {{ lessons.length }}
              </span>
              <UButton
                v-if="lessons.findIndex(l => l.id === activeLesson!.id) < lessons.length - 1"
                trailing-icon="i-lucide-chevron-right"
                label="Berikutnya"
                color="neutral"
                variant="outline"
                @click="openLesson(lessons[lessons.findIndex(l => l.id === activeLesson!.id) + 1]!)"
              />
              <div v-else />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
