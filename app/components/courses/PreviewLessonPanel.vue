<script setup lang="ts">
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

const props = defineProps<{
  courseId: string
  lessons: LessonMeta[]
  loadingList: boolean
}>()

const supabase = useSupabaseClient()

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

function backToList() {
  activeLesson.value = null
  loadingLesson.value = false
}

const activeIdx = computed(() => props.lessons.findIndex(l => l.id === activeLesson.value?.id))

function goNext() {
  const next = props.lessons[activeIdx.value + 1]
  if (next) selectLesson(next)
}

function goPrev() {
  const prev = props.lessons[activeIdx.value - 1]
  if (prev) selectLesson(prev)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function statusDot(lesson: LessonMeta) {
  switch (lesson.status) {
    case 'approved': return { icon: 'i-lucide-circle-check', cls: 'text-success-500' }
    case 'pending': return { icon: 'i-lucide-circle', cls: 'text-muted' }
    case 'rejected': return { icon: 'i-lucide-circle-x', cls: 'text-error-500' }
    case 'archived': return { icon: 'i-lucide-archive', cls: 'text-muted' }
    default: return { icon: 'i-lucide-circle', cls: 'text-muted' }
  }
}

const allLessonsSimple = computed(() => props.lessons.map(l => ({ id: l.id, title: l.title })))
</script>

<template>
  <div class="flex flex-col h-full min-h-0">

    <!-- Header bar -->
    <div class="border-b border-default px-4 py-3 flex items-center gap-2 shrink-0 bg-default">
      <UButton
        v-if="activeLesson || loadingLesson"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="xs"
        @click="backToList"
      />
      <span class="font-semibold text-highlighted text-sm truncate flex-1">
        <template v-if="activeLesson">{{ activeLesson.title }}</template>
        <template v-else-if="loadingLesson">Memuat lesson…</template>
        <template v-else>{{ lessons.length }} Lesson</template>
      </span>
      <!-- Nav buttons when lesson active -->
      <template v-if="activeLesson">
        <span class="text-xs text-muted tabular-nums shrink-0">{{ activeIdx + 1 }}/{{ lessons.length }}</span>
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="activeIdx <= 0"
          @click="goPrev"
        />
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="ghost"
          size="xs"
          :disabled="activeIdx >= lessons.length - 1"
          @click="goNext"
        />
      </template>
      <!-- Add lesson button when on list view -->
      <UButton
        v-else-if="!loadingLesson"
        :to="`/courses/${courseId}/lessons`"
        icon="i-lucide-plus"
        label="Tambah Lesson"
        color="neutral"
        variant="outline"
        size="xs"
      />
    </div>

    <!-- Loading lesson skeleton -->
    <div v-if="loadingLesson" class="flex-1 overflow-y-auto p-6 space-y-4">
      <USkeleton class="h-7 w-2/3 rounded" />
      <USkeleton class="h-4 w-1/4 rounded" />
      <USkeleton class="h-52 rounded-xl" />
      <USkeleton class="h-52 rounded-xl" />
    </div>

    <!-- Lesson list -->
    <div v-else-if="!activeLesson" class="flex-1 overflow-y-auto">
      <div v-if="loadingList" class="p-3 space-y-2">
        <USkeleton v-for="i in 6" :key="i" class="h-12 rounded-lg" />
      </div>

      <div
        v-else-if="lessons.length === 0"
        class="h-full flex flex-col items-center justify-center gap-3 p-8 text-center"
      >
        <UIcon name="i-lucide-layers" class="size-10 text-muted" />
        <p class="text-sm font-medium text-highlighted">Belum ada lesson</p>
        <UButton :to="`/courses/${courseId}/lessons`" size="sm" label="Buat Lesson" />
      </div>

      <div v-else class="p-2 space-y-1">
        <div
          v-for="(lesson, idx) in lessons"
          :key="lesson.id"
          class="flex items-center gap-2.5 px-3 py-3 rounded-lg cursor-pointer border transition-colors hover:bg-elevated border-transparent"
          @click="selectLesson(lesson)"
        >
          <span class="text-xs font-mono text-muted w-5 text-center shrink-0">{{ idx + 1 }}</span>
          <UIcon
            :name="statusDot(lesson).icon"
            class="size-3.5 shrink-0"
            :class="statusDot(lesson).cls"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm text-highlighted truncate">{{ lesson.title }}</p>

          </div>
          <UIcon name="i-lucide-chevron-right" class="size-4 text-muted shrink-0" />
        </div>
      </div>
    </div>

    <!-- Lesson detail -->
    <div v-else-if="activeLesson" :key="activeLesson.id" class="flex-1 overflow-y-auto">
      <CoursesPreviewLessonDetail
        :course-id="courseId"
        :lesson="activeLesson"
        :all-lessons="allLessonsSimple"
      />
    </div>
  </div>
</template>
