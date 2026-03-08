<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

interface CommentUser {
  full_name: string | null
  username: string | null
  avatar_url: string | null
}

interface Comment {
  id: string
  content: string
  user_id: string
  lesson_id: string | null
  parent_id: string | null
  is_hidden: boolean
  deleted_at: string | null
  created_at: string
  user: CommentUser | null
}

const props = defineProps<{
  courseId: string
  lessons: { id: string, title: string }[]
}>()

const supabase = useSupabase()
const toast = useToast()

// ─── State ────────────────────────────────────────────────────────────────────
const comments = ref<Comment[]>([])
const loading = ref(false)
const filterLesson = ref<string>('all')
const showHidden = ref(false)
const actionLoadingId = ref<string | null>(null)

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchComments() {
  loading.value = true
  let q = supabase
    .from('course_comments')
    .select('id, content, user_id, lesson_id, parent_id, is_hidden, deleted_at, created_at, user:profiles(full_name, username, avatar_url)')
    .eq('course_id', props.courseId)
    .is('deleted_at', null)
    .order('created_at')

  const { data } = await q
  comments.value = (data ?? []) as Comment[]
  loading.value = false
}

onMounted(fetchComments)

// ─── Filtered + tree ─────────────────────────────────────────────────────────
const filtered = computed(() => {
  return comments.value.filter(c => {
    if (!showHidden.value && c.is_hidden) return false
    if (filterLesson.value !== 'all' && c.lesson_id !== filterLesson.value) return false
    return true
  })
})

// Build tree (max 3 levels for display)
interface CommentNode extends Comment {
  replies: CommentNode[]
}


const tree = computed((): CommentNode[] => {
  const map = new Map<string, CommentNode>()
  for (const c of filtered.value) {
    map.set(c.id, { ...c, replies: [] })
  }
  const roots: CommentNode[] = []
  for (const [, node] of map) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.replies.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
})

// ─── Lesson options ───────────────────────────────────────────────────────────
const lessonOptions = computed(() => [
  { label: 'Semua Lesson', value: 'all' },
  ...props.lessons.map(l => ({ label: l.title, value: l.id }))
])

// ─── Actions ─────────────────────────────────────────────────────────────────
function fmt(date: string) {
  return format(new Date(date), 'd MMM yyyy HH:mm', { locale: localeId })
}

async function toggleHide(comment: Comment) {
  actionLoadingId.value = comment.id
  const newVal = !comment.is_hidden
  const { error } = await supabase
    .from('course_comments')
    .update({ is_hidden: newVal })
    .eq('id', comment.id)
  actionLoadingId.value = null
  if (error) { toast.add({ title: 'Gagal', description: error.message, color: 'error' }); return }
  const idx = comments.value.findIndex(c => c.id === comment.id)
  if (idx >= 0) comments.value[idx]!.is_hidden = newVal
  toast.add({ title: newVal ? 'Komentar disembunyikan' : 'Komentar ditampilkan', color: 'success', duration: 2000 })
}

async function deleteComment(comment: Comment) {
  if (!confirm('Hapus komentar ini permanen?')) return
  actionLoadingId.value = comment.id
  const { error } = await supabase
    .from('course_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', comment.id)
  actionLoadingId.value = null
  if (error) { toast.add({ title: 'Gagal', description: error.message, color: 'error' }); return }
  comments.value = comments.value.filter(c => c.id !== comment.id)
  toast.add({ title: 'Komentar dihapus', color: 'success', duration: 2000 })
}
</script>

<template>
  <div class="space-y-3">
    <!-- Filters -->
    <div class="flex flex-wrap gap-2 items-center">
      <USelect
        v-model="filterLesson"
        :items="lessonOptions"
        class="w-52"
        size="sm"
      />
      <UButton
        :icon="showHidden ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        :label="showHidden ? 'Sembunyikan hidden' : 'Tampilkan hidden'"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="showHidden = !showHidden"
      />
      <UButton
        icon="i-lucide-refresh-cw"
        size="sm"
        color="neutral"
        variant="ghost"
        :loading="loading"
        @click="fetchComments"
      />
      <span class="text-xs text-muted ml-auto">{{ filtered.length }} komentar</span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-2">
      <USkeleton v-for="i in 4" :key="i" class="h-16 rounded-lg" />
    </div>

    <!-- Empty -->
    <div v-else-if="tree.length === 0" class="py-10 text-center text-sm text-muted">
      <UIcon name="i-lucide-message-circle" class="size-8 mb-2" />
      <p>Belum ada komentar.</p>
    </div>

    <!-- Tree -->
    <template v-else>
      <CommentNode
        v-for="node in tree"
        :key="node.id"
        :comment="node"
        :depth="0"
        :action-loading-id="actionLoadingId"
        :fmt="fmt"
        @toggle-hide="toggleHide"
        @delete="deleteComment"
      />
    </template>
  </div>
</template>
