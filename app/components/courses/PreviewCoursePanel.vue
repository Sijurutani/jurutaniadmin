<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

interface CourseDetail {
  id: string
  title: string
  slug: string
  cover_image: string | null
  category: string | null
  status: string
  created_at: string
  updated_at: string | null
  author: {
    id: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

interface CompletionRow {
  user_id: string
  completed_at: string | null
  lesson_count: number | null
  invalidated_at: string | null
  user: { full_name: string | null, username: string | null, avatar_url: string | null } | null
}

interface RatingRow {
  course_id: string
  user_id: string
  rating: number
  review: string | null
  created_at: string
  user: { full_name: string | null, username: string | null, avatar_url: string | null } | null
}

const props = defineProps<{
  course: CourseDetail
  courseId: string
  lessonCount: number
}>()

const emit = defineEmits<{
  invalidated: [userId: string]
}>()

const supabase = useSupabaseClient()

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const courseTab = ref('completions')

const courseTabs = [
  { value: 'completions', label: 'Completions', icon: 'i-lucide-graduation-cap' },
  { value: 'ratings',     label: 'Ratings',     icon: 'i-lucide-star' }
]

// ─── Completions ──────────────────────────────────────────────────────────────
const completions = ref<CompletionRow[]>([])
const completionsLoaded = ref(false)

async function loadCompletions() {
  if (completionsLoaded.value) return
  const { data } = await supabase
    .from('course_completions')
    .select('user_id, completed_at, lesson_count, invalidated_at, user:profiles(full_name, username, avatar_url)')
    .eq('course_id', props.courseId)
    .order('completed_at', { ascending: false })
  completions.value = (data ?? []) as CompletionRow[]
  completionsLoaded.value = true
}

// ─── Ratings ──────────────────────────────────────────────────────────────────
const ratings = ref<RatingRow[]>([])
const ratingsLoaded = ref(false)

async function loadRatings() {
  if (ratingsLoaded.value) return
  const { data } = await supabase
    .from('course_ratings')
    .select('course_id, user_id, rating, review, created_at, user:profiles(full_name, username, avatar_url)')
    .eq('course_id', props.courseId)
    .order('created_at', { ascending: false })
  ratings.value = (data ?? []) as RatingRow[]
  ratingsLoaded.value = true
}

watch(courseTab, (tab) => {
  if (tab === 'completions') loadCompletions()
  else if (tab === 'ratings') loadRatings()
}, { immediate: true })

const courseTabItems = computed(() => courseTabs.map(t => ({
  ...t,
  label: t.value === 'completions' && completionsLoaded.value
    ? `Completions (${completions.value.length})`
    : t.value === 'ratings' && ratingsLoaded.value
      ? `Ratings (${ratings.value.length})`
      : t.label
})))

// ─── Computed ─────────────────────────────────────────────────────────────────
const categoryInfo = computed(() => Enum.CourseCategories.find(c => c.value === props.course.category))
const statusInfo = computed(() => Enum.StatusLearning.find(s => s.value === props.course.status))

const avgRating = computed(() => {
  if (!ratings.value.length) return null
  return (ratings.value.reduce((a, r) => a + r.rating, 0) / ratings.value.length).toFixed(1)
})

function fmt(date: string | null) {
  if (!date) return '-'
  return format(new Date(date), 'd MMM yyyy', { locale: localeId })
}

function onInvalidated(userId: string) {
  const idx = completions.value.findIndex(c => c.user_id === userId)
  if (idx >= 0) completions.value[idx]!.invalidated_at = new Date().toISOString()
  emit('invalidated', userId)
}
</script>

<template>
  <div class="border-r border-default flex flex-col overflow-y-auto">

    <!-- Cover image -->
    <div class="relative aspect-video shrink-0 overflow-hidden bg-elevated">
      <img
        v-if="course.cover_image"
        :src="course.cover_image"
        :alt="course.title"
        class="w-full h-full object-cover"
      >
      <div v-else class="w-full h-full flex items-center justify-center">
        <UIcon name="i-lucide-image" class="size-10 text-muted" />
      </div>
    </div>

    <!-- Course meta -->
    <div class="p-5 space-y-3 shrink-0">
      <div class="flex flex-wrap items-center gap-2">
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
        <div v-if="avgRating" class="flex items-center gap-1 ml-auto">
          <UIcon name="i-lucide-star" class="size-3.5 text-yellow-400 fill-yellow-400" />
          <span class="text-sm font-semibold text-highlighted">{{ avgRating }}</span>
          <span class="text-xs text-muted">({{ ratings.length }})</span>
        </div>
      </div>

      <h1 class="text-lg font-bold text-highlighted leading-snug">{{ course.title }}</h1>

      <div class="text-xs text-muted space-y-1">
        <div v-if="course.author?.full_name" class="flex items-center gap-1.5">
          <UAvatar
            :src="course.author.avatar_url ?? undefined"
            :alt="course.author.full_name"
            size="2xs"
            class="shrink-0"
          />
          <span>{{ course.author.full_name }}</span>
        </div>
        <div class="flex flex-wrap gap-x-3 gap-y-0.5">
          <span>{{ lessonCount }} lesson</span>
          <span>Dibuat {{ fmt(course.created_at) }}</span>
          <span v-if="course.updated_at">Diperbarui {{ fmt(course.updated_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Course management tabs: Completions | Ratings -->
    <div class="border-t border-default flex flex-col flex-1">
      <div class="px-4 pt-3">
        <UTabs
          v-model="courseTab"
          :items="courseTabItems"
          :content="false"
          size="sm"
        />
      </div>

      <!-- Completions -->
      <div v-if="courseTab === 'completions'" class="flex-1 p-4">
        <CoursesCompletionsTable
          :completions="completions"
          :course-title="course.title"
          :course-id="courseId"
          @invalidated="onInvalidated"
        />
      </div>

      <!-- Ratings -->
      <div v-else-if="courseTab === 'ratings'" class="flex-1 p-4 space-y-5">
        <UPageCard class="max-w-xs">
          <CoursesRatingsSummary :ratings="ratings" />
        </UPageCard>
        <div class="space-y-3">
          <div
            v-for="r in ratings"
            :key="`${r.course_id}-${r.user_id}`"
            class="flex gap-3 border border-default rounded-lg p-3.5 bg-default"
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
                    :class="['size-3', s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted fill-none']"
                  />
                </div>
                <span class="text-xs text-muted ml-auto">{{ fmt(r.created_at) }}</span>
              </div>
              <p v-if="r.review" class="text-xs text-default mt-1">{{ r.review }}</p>
              <p v-else class="text-xs text-muted italic mt-1">Tidak ada ulasan tertulis</p>
            </div>
          </div>
          <div v-if="ratings.length === 0 && ratingsLoaded" class="py-8 text-center text-sm text-muted">
            <UIcon name="i-lucide-star" class="size-7 mb-2" />
            <p>Belum ada rating.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
