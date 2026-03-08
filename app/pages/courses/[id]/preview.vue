<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

const route = useRoute()
const courseId = route.params.id as string

useHead({ title: 'Preview Course – Jurutani Admin' })

const supabase = useSupabase()
const toast = useToast()

// ─── Course header ────────────────────────────────────────────────────────────
interface CourseDetail {
  id: string
  title: string
  slug: string
  cover_image: string | null
  category: string | null
  status: string
  published_at: string | null
  created_at: string
  author: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

const { data: course, error: courseError } = await useAsyncData(`preview-course-${courseId}`, async () => {
  const { data } = await supabase
    .from('learning_courses')
    .select('id, title, slug, cover_image, category, status, published_at, created_at, author:profiles(id, full_name, username, avatar_url)')
    .eq('id', courseId)
    .single()
  return data as CourseDetail | null
})

if (courseError.value || !course.value) await navigateTo('/courses')

// ─── Active tab ───────────────────────────────────────────────────────────────
const activeTab = useRouteQuery('tab', 'lessons')

const tabs = [
  { value: 'lessons',     label: 'Lessons',      icon: 'i-lucide-layers' },
  { value: 'completions', label: 'Completions',  icon: 'i-lucide-graduation-cap' },
  { value: 'comments',    label: 'Komentar',     icon: 'i-lucide-message-circle' },
  { value: 'ratings',     label: 'Ratings',      icon: 'i-lucide-star' }
]

// ─── Lessons tab ──────────────────────────────────────────────────────────────
interface LessonMeta {
  id: string
  title: string
  slug: string
  status: string
  published_at: string | null
  order_index: number
}

const lessons = ref<LessonMeta[]>([])
const lessonsLoaded = ref(false)
const lessonsLoading = ref(false)

async function loadLessons() {
  if (lessonsLoaded.value) return
  lessonsLoading.value = true
  const { data } = await supabase
    .from('course_lessons')
    .select('id, title, slug, status, published_at, order_index')
    .eq('course_id', courseId)
    .is('deleted_at', null)
    .order('order_index')
  lessons.value = (data ?? []) as LessonMeta[]
  lessonsLoaded.value = true
  lessonsLoading.value = false
}

// ─── Completions tab ──────────────────────────────────────────────────────────
interface CompletionRow {
  user_id: string
  completed_at: string | null
  lesson_count: number | null
  invalidated_at: string | null
  user: { full_name: string | null, username: string | null, avatar_url: string | null } | null
}

const completions = ref<CompletionRow[]>([])
const completionsLoaded = ref(false)

async function loadCompletions() {
  if (completionsLoaded.value) return
  const { data } = await supabase
    .from('course_completions')
    .select('user_id, completed_at, lesson_count, invalidated_at, user:profiles(full_name, username, avatar_url)')
    .eq('course_id', courseId)
    .order('completed_at', { ascending: false })
  completions.value = (data ?? []) as CompletionRow[]
  completionsLoaded.value = true
}

// ─── Ratings tab ─────────────────────────────────────────────────────────────
interface RatingRow {
  course_id: string
  user_id: string
  rating: number
  review: string | null
  created_at: string
  user: { full_name: string | null, username: string | null, avatar_url: string | null } | null
}

const ratings = ref<RatingRow[]>([])
const ratingsLoaded = ref(false)

async function loadRatings() {
  if (ratingsLoaded.value) return
  const { data } = await supabase
    .from('course_ratings')
    .select('course_id, user_id, rating, review, created_at, user:profiles(full_name, username, avatar_url)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })
  ratings.value = (data ?? []) as RatingRow[]
  ratingsLoaded.value = true
}

// ─── Watch tab change → lazy load ─────────────────────────────────────────────
watch(activeTab, (tab) => {
  if (tab === 'lessons') loadLessons()
  else if (tab === 'completions') loadCompletions()
  else if (tab === 'ratings') loadRatings()
}, { immediate: true })

// ─── Tab counts label ─────────────────────────────────────────────────────────
const tabItems = computed(() => tabs.map(t => ({
  ...t,
  label: t.value === 'lessons' && lessonsLoaded.value
    ? `Lessons (${lessons.value.length})`
    : t.value === 'completions' && completionsLoaded.value
      ? `Completions (${completions.value.length})`
      : t.value === 'ratings' && ratingsLoaded.value
        ? `Ratings (${ratings.value.length})`
        : t.label
})))

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(date: string | null) {
  if (!date) return '-'
  return format(new Date(date), 'd MMM yyyy', { locale: localeId })
}

const categoryInfo = computed(() =>
  Enum.CourseCategories.find(c => c.value === course.value?.category)
)

const statusInfo = computed(() =>
  Enum.StatusLearning.find(s => s.value === course.value?.status)
)

function dripLabel(lesson: LessonMeta): string | null {
  if (!lesson.published_at) return null
  const diff = new Date(lesson.published_at).getTime() - Date.now()
  if (diff <= 0) return null
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return `Rilis dalam ${days} hari`
}

// Handle completion invalidation from child
function onInvalidated(userId: string) {
  const idx = completions.value.findIndex(c => c.user_id === userId)
  if (idx >= 0) completions.value[idx]!.invalidated_at = new Date().toISOString()
}
</script>

<template>
  <UDashboardPanel id="courses-preview">
    <template #header>
      <UDashboardNavbar :title="course?.title ?? '...'">
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
          <div class="flex gap-2">
            <UButton
              :to="`/courses/${courseId}/lessons`"
              icon="i-lucide-layers"
              label="Kelola Lesson"
              color="neutral"
              variant="outline"
              size="sm"
            />
            <UButton
              :to="`/courses/${courseId}/edit`"
              icon="i-lucide-pencil"
              label="Edit"
              size="sm"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="course" class="max-w-5xl mx-auto pb-10">
        <!-- ── Hero ──────────────────────────────────────────────────────── -->
        <div class="rounded-xl overflow-hidden border border-default mb-6">
          <!-- Cover -->
          <div class="relative bg-elevated aspect-video max-h-64 overflow-hidden">
            <img
              v-if="course.cover_image"
              :src="course.cover_image"
              :alt="course.title"
              class="w-full h-full object-cover"
            >
            <div v-else class="w-full h-full flex items-center justify-center">
              <UIcon name="i-lucide-image" class="size-12 text-muted" />
            </div>
          </div>

          <!-- Meta -->
          <div class="p-5 bg-default">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <UBadge
                v-if="categoryInfo"
                :label="categoryInfo.label"
                color="neutral"
                variant="subtle"
                size="sm"
              >
                <template #leading>
                  <UIcon :name="categoryInfo.icon" class="size-3" />
                </template>
              </UBadge>

              <UBadge
                v-if="statusInfo"
                :label="statusInfo.label"
                :color="statusInfo.color as any"
                variant="soft"
                size="sm"
              />

              <!-- Rating mini -->
              <div v-if="ratingsLoaded && ratings.length > 0" class="flex items-center gap-1 ml-auto">
                <UIcon name="i-lucide-star" class="size-4 text-yellow-400 fill-yellow-400" />
                <span class="text-sm font-semibold text-highlighted">
                  {{ (ratings.reduce((a, r) => a + r.rating, 0) / ratings.length).toFixed(1) }}
                </span>
                <span class="text-xs text-muted">({{ ratings.length }})</span>
              </div>
            </div>

            <h1 class="text-xl font-bold text-highlighted mb-1">{{ course.title }}</h1>
            <p class="text-sm text-muted">
              <span v-if="course.author?.full_name">oleh {{ course.author.full_name }}</span>
              <span class="mx-1">·</span>
              Dibuat {{ fmt(course.created_at) }}
              <span v-if="lessons.length > 0" class="mx-1">·</span>
              <span v-if="lessons.length > 0">{{ lessons.length }} lesson</span>
            </p>
          </div>
        </div>

        <!-- ── Tabs ──────────────────────────────────────────────────────── -->
        <UTabs
          v-model="activeTab"
          :items="tabItems"
          :content="false"
          class="w-full"
        />

        <!-- Lessons -->
        <div v-if="activeTab === 'lessons'" class="mt-4 space-y-2">
          <div v-if="lessonsLoading" class="space-y-2">
            <USkeleton v-for="i in 5" :key="i" class="h-12 rounded-lg" />
          </div>
          <div v-else-if="lessons.length === 0" class="py-8 text-center text-sm text-muted">
            <UIcon name="i-lucide-layers" class="size-8 mb-2" />
            <p>Belum ada lesson.</p>
            <UButton
              :to="`/courses/${courseId}/lessons`"
              label="Tambah Lesson"
              size="sm"
              class="mt-2"
            />
          </div>
          <div
            v-for="(lesson, idx) in lessons"
            v-else
            :key="lesson.id"
            class="flex items-center gap-3 px-4 py-3 rounded-lg border border-default bg-default hover:bg-elevated/50 transition-colors"
          >
            <span class="text-sm font-mono text-muted w-5 text-center shrink-0">{{ idx + 1 }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-highlighted truncate">{{ lesson.title }}</p>
              <p v-if="dripLabel(lesson)" class="text-xs text-warning-500">
                <UIcon name="i-lucide-clock" class="size-3 inline mr-0.5" />
                {{ dripLabel(lesson) }}
              </p>
            </div>
            <UBadge
              :label="Enum.StatusLearning.find(s => s.value === lesson.status)?.label ?? lesson.status"
              :color="(Enum.StatusLearning.find(s => s.value === lesson.status)?.color ?? 'neutral') as any"
              variant="soft"
              size="xs"
            />
            <UButton
              :to="`/courses/${courseId}/lessons?lesson=${lesson.id}`"
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="xs"
            />
          </div>
        </div>

        <!-- Completions -->
        <div v-else-if="activeTab === 'completions'" class="mt-4">
          <CoursesCompletionsTable
            :completions="completions"
            :course-title="course.title"
            :course-id="courseId"
            @invalidated="onInvalidated"
          />
        </div>

        <!-- Comments -->
        <div v-else-if="activeTab === 'comments'" class="mt-4">
          <CoursesCommentsPanel
            :course-id="courseId"
            :lessons="lessons.map(l => ({ id: l.id, title: l.title }))"
          />
        </div>

        <!-- Ratings -->
        <div v-else-if="activeTab === 'ratings'" class="mt-4 space-y-6">
          <UPageCard title="Ringkasan Rating" class="max-w-sm">
            <CoursesRatingsSummary :ratings="ratings" />
          </UPageCard>
          <div class="space-y-3">
            <div
              v-for="r in ratings"
              :key="`${r.course_id}-${r.user_id}`"
              class="flex gap-3 border border-default rounded-lg p-4 bg-default"
            >
              <UAvatar
                :src="r.user?.avatar_url ?? undefined"
                :alt="r.user?.full_name ?? '?'"
                size="sm"
                class="shrink-0"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium text-highlighted">{{ r.user?.full_name ?? '-' }}</span>
                  <div class="flex gap-0.5">
                    <UIcon
                      v-for="s in 5"
                      :key="s"
                      name="i-lucide-star"
                      :class="['size-3.5', s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted fill-none']"
                    />
                  </div>
                  <span class="text-xs text-muted ml-auto">{{ fmt(r.created_at) }}</span>
                </div>
                <p v-if="r.review" class="text-sm text-default mt-1">{{ r.review }}</p>
                <p v-else class="text-xs text-muted italic mt-1">Tidak ada ulasan tertulis</p>
              </div>
            </div>
            <div v-if="ratings.length === 0 && ratingsLoaded" class="py-8 text-center text-sm text-muted">
              <UIcon name="i-lucide-star" class="size-8 mb-2" />
              <p>Belum ada rating.</p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
