<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import type { EmbedItem } from '~/utils/embed'

interface LessonMeta {
  id: string
  title: string
  slug: string
  status: string
  published_at: string | null
  order_index: number
}

interface LessonFull extends LessonMeta {
  content: Record<string, any> | null
  embeds: EmbedItem[]
}

interface LessonProgressRow {
  lesson_id: string
  user_id: string
  completed_at: string
  user: { full_name: string | null, username: string | null, avatar_url: string | null } | null
}

const props = defineProps<{
  courseId: string
  lesson: LessonFull
  allLessons: { id: string, title: string }[]
}>()

const supabase = useSupabaseClient()

const lessonTab = ref('comments')
const lessonTabs = [
  { value: 'comments', label: 'Komentar', icon: 'i-lucide-message-circle' },
  { value: 'progress', label: 'Progress', icon: 'i-lucide-chart-bar' }
]

// ─── Lesson Progress ──────────────────────────────────────────────────────────
const lessonProgress = ref<LessonProgressRow[]>([])
const progressLoaded = ref(false)

async function loadLessonProgress() {
  if (progressLoaded.value) return
  const { data } = await supabase
    .from('course_lesson_progress')
    .select('lesson_id, user_id, completed_at, user:profiles(full_name, username, avatar_url)')
    .eq('course_id', props.courseId)
    .eq('lesson_id', props.lesson.id)
    .order('completed_at', { ascending: false })
  lessonProgress.value = (data ?? []) as LessonProgressRow[]
  progressLoaded.value = true
}

watch(lessonTab, (tab) => {
  if (tab === 'progress') loadLessonProgress()
})

// Reset progress state when switching lessons
watch(() => props.lesson.id, () => {
  lessonProgress.value = []
  progressLoaded.value = false
  lessonTab.value = 'comments'
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(date: string | null) {
  if (!date) return '-'
  return format(new Date(date), 'd MMM yyyy', { locale: localeId })
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 pt-6 pb-12 space-y-6">

    <!-- Lesson header -->
    <div class="space-y-2 pb-4 border-b border-default">
      <div class="flex flex-wrap items-center gap-2">
        <UBadge
          :label="Enum.StatusLearning.find(s => s.value === lesson.status)?.label ?? lesson.status"
          :color="(Enum.StatusLearning.find(s => s.value === lesson.status)?.color ?? 'neutral') as any"
          variant="soft"
          size="sm"
        />
        <UButton
          :to="`/courses/${courseId}/lessons`"
          icon="i-lucide-pencil"
          label="Edit"
          color="neutral"
          variant="ghost"
          size="xs"
          class="ml-auto"
        />
      </div>
      <p class="text-xs text-muted font-mono">{{ lesson.slug }}</p>
    </div>

    <!-- Materi -->
    <div>
      <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Materi</p>
      <div
        v-if="lesson.content"
        class="rounded-xl border border-default bg-default overflow-hidden"
      >
        <UEditor
          v-model="lesson.content"
          content-type="json"
          :editable="false"
          class="prose dark:prose-invert max-w-none px-6 py-5"
        />
      </div>
      <div v-else class="rounded-xl border border-dashed border-default py-10 text-center">
        <UIcon name="i-lucide-file-text" class="size-7 text-muted mb-2" />
        <p class="text-sm text-muted">Belum ada konten materi.</p>
      </div>
    </div>

    <!-- Embeds -->
    <div v-if="lesson.embeds.length > 0">
      <p class="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
        Media ({{ lesson.embeds.length }})
      </p>
      <div class="space-y-5">
        <CoursesLessonEmbedItem
          v-for="(embed, eIdx) in lesson.embeds"
          :key="embed.id"
          :embed="embed"
          :index="eIdx"
        />
      </div>
    </div>

    <!-- Data Lesson tabs: Komentar | Progress -->
    <div class="border-t border-default pt-6 space-y-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wide">Data Lesson</p>
      <UTabs
        v-model="lessonTab"
        :items="lessonTabs"
        :content="false"
        size="sm"
      />

      <!-- Komentar -->
      <div v-if="lessonTab === 'comments'">
        <CoursesCommentsPanel
          :course-id="courseId"
          :lessons="allLessons"
          :lesson-id="lesson.id"
        />
      </div>

      <!-- Progress: who completed this lesson -->
      <div v-else-if="lessonTab === 'progress'">
        <div v-if="!progressLoaded" class="space-y-2">
          <USkeleton v-for="i in 3" :key="i" class="h-12 rounded-lg" />
        </div>
        <div v-else-if="lessonProgress.length === 0" class="py-8 text-center text-sm text-muted">
          <UIcon name="i-lucide-chart-bar" class="size-7 mb-2" />
          <p>Belum ada user yang menyelesaikan lesson ini.</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="row in lessonProgress"
            :key="row.user_id"
            class="flex items-center gap-3 px-4 py-3 rounded-lg border border-default bg-default"
          >
            <UAvatar
              :src="row.user?.avatar_url ?? undefined"
              :alt="row.user?.full_name ?? '?'"
              size="sm"
              class="shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-highlighted">{{ row.user?.full_name ?? '-' }}</p>
              <p class="text-xs text-muted">@{{ row.user?.username ?? '-' }}</p>
            </div>
            <div class="text-right shrink-0 text-xs text-muted">
              <UIcon name="i-lucide-circle-check" class="size-3.5 text-success-500 inline mr-1" />
              {{ fmt(row.completed_at) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
