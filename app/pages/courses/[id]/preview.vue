<script setup lang="ts">
const route = useRoute()
const courseId = route.params.id as string

useHead({ title: 'Preview Course – Jurutani Admin' })

const supabase = useSupabaseClient()

// ─── Course ───────────────────────────────────────────────────────────────────
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

const { data: course, pending: coursePending } = await useAsyncData(`preview-course-${courseId}`, async () => {
  const { data } = await supabase
    .from('learning_courses')
    .select('id, title, slug, cover_image, category, status, created_at, updated_at, author:profiles!learning_courses_author_id_fkey(id, full_name, username, avatar_url)')
    .eq('id', courseId)
    .single()
  return data as CourseDetail | null
}, { server: false })

if (import.meta.client && !course.value) {
  await navigateTo('/courses')
}

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
      <!-- Loading skeleton -->
      <div v-if="coursePending" class="grid lg:grid-cols-[380px_1fr] h-full">
        <div class="border-r border-default p-4 space-y-3">
          <USkeleton class="aspect-video rounded-xl" />
          <USkeleton class="h-6 w-3/4 rounded" />
          <USkeleton class="h-5 w-1/2 rounded" />
          <USkeleton class="h-5 w-1/3 rounded" />
        </div>
        <div class="p-4 space-y-2">
          <USkeleton v-for="i in 6" :key="i" class="h-12 rounded-lg" />
        </div>
      </div>

      <!-- Main layout: Left = Course detail, Right = Lesson list / content -->
      <div
        v-else-if="course"
        class="grid lg:grid-cols-[380px_1fr] h-full"
        style="min-height: calc(100vh - 4rem)"
      >
        <CoursesPreviewCoursePanel
          :course="course"
          :course-id="courseId"
          :lesson-count="lessons.length"
        />
        <CoursesPreviewLessonPanel
          :course-id="courseId"
          :lessons="lessons"
          :loading-list="loadingList"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
