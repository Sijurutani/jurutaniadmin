<script setup lang="ts">
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

interface CompletionRow {
  user_id: string
  completed_at: string | null
  lesson_count: number | null
  invalidated_at: string | null
  user: {
    full_name: string | null
    username: string | null
    avatar_url: string | null
  } | null
}

const props = defineProps<{
  completions: CompletionRow[]
  courseTitle: string
  courseId: string
}>()

const emit = defineEmits<{
  invalidated: [userId: string]
}>()

const supabase = useSupabaseClient()
const toast = useToast()

function fmt(date: string | null) {
  if (!date) return '-'
  return format(new Date(date), 'd MMM yyyy HH:mm', { locale: localeId })
}

// ─── Export ───────────────────────────────────────────────────────────────────
const exportColumns = [
  { key: 'name',         header: 'Nama User' },
  { key: 'username',     header: 'Username' },
  { key: 'completed_at', header: 'Selesai Pada' },
  { key: 'lesson_count', header: 'Jumlah Lesson' },
  { key: 'status',       header: 'Status' }
]

function buildRows() {
  return props.completions.map(c => ({
    name: c.user?.full_name ?? '-',
    username: c.user?.username ? `@${c.user.username}` : '-',
    completed_at: fmt(c.completed_at),
    lesson_count: String(c.lesson_count ?? 0),
    status: c.invalidated_at ? 'Dicabut' : 'Valid'
  }))
}

async function doExportPdf() {
  await exportToPdf(
    buildRows(),
    exportColumns,
    `completions-${props.courseId}`,
    `Rekap Penyelesaian: ${props.courseTitle}`
  )
}

async function doExportExcel() {
  await exportToExcel(
    buildRows(),
    exportColumns,
    `completions-${props.courseId}`,
    'Completions'
  )
}

// ─── Invalidate ───────────────────────────────────────────────────────────────
const invalidatingId = ref<string | null>(null)

async function invalidate(userId: string) {
  if (!confirm('Yakin ingin mencabut sertifikat penyelesaian user ini?')) return
  invalidatingId.value = userId
  const { error } = await supabase
    .from('course_completions')
    .update({ invalidated_at: new Date().toISOString() })
    .eq('course_id', props.courseId)
    .eq('user_id', userId)
  invalidatingId.value = null
  if (error) {
    toast.add({ title: 'Gagal mencabut', description: error.message, color: 'error' })
    return
  }
  toast.add({ title: 'Sertifikat dicabut', color: 'warning', duration: 2500 })
  emit('invalidated', userId)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <p class="text-sm text-muted">{{ completions.length }} penyelesaian tercatat</p>
      <div class="flex gap-2">
        <UButton
          icon="i-lucide-file-spreadsheet"
          label="Excel"
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="completions.length === 0"
          @click="doExportExcel"
        />
        <UButton
          icon="i-lucide-file-text"
          label="PDF"
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="completions.length === 0"
          @click="doExportPdf"
        />
      </div>
    </div>

    <!-- Empty -->
    <div v-if="completions.length === 0" class="py-10 text-center text-sm text-muted">
      <UIcon name="i-lucide-graduation-cap" class="size-8 mb-2 text-muted" />
      <p>Belum ada yang menyelesaikan course ini.</p>
    </div>

    <!-- Table -->
    <div v-else class="border border-default rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-elevated text-muted">
          <tr>
            <th class="text-left px-4 py-2.5 font-medium">User</th>
            <th class="text-left px-4 py-2.5 font-medium">Selesai Pada</th>
            <th class="text-center px-4 py-2.5 font-medium">Lesson</th>
            <th class="text-center px-4 py-2.5 font-medium">Status</th>
            <th class="text-right px-4 py-2.5 font-medium" />
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr v-for="c in completions" :key="c.user_id" class="hover:bg-elevated/50 transition-colors">
            <td class="px-4 py-2.5">
              <div class="flex items-center gap-2">
                <UAvatar
                  :src="c.user?.avatar_url ?? undefined"
                  :alt="c.user?.full_name ?? '?'"
                  size="xs"
                />
                <div>
                  <p class="font-medium text-highlighted">{{ c.user?.full_name ?? '-' }}</p>
                  <p v-if="c.user?.username" class="text-xs text-muted">@{{ c.user.username }}</p>
                </div>
              </div>
            </td>
            <td class="px-4 py-2.5 text-muted">{{ fmt(c.completed_at) }}</td>
            <td class="px-4 py-2.5 text-center tabular-nums">{{ c.lesson_count ?? 0 }}</td>
            <td class="px-4 py-2.5 text-center">
              <UBadge
                :label="c.invalidated_at ? 'Dicabut' : 'Valid'"
                :color="c.invalidated_at ? 'error' : 'success'"
                variant="soft"
                size="sm"
              />
            </td>
            <td class="px-4 py-2.5 text-right">
              <UButton
                v-if="!c.invalidated_at"
                icon="i-lucide-x-circle"
                label="Cabut"
                color="error"
                variant="ghost"
                size="xs"
                :loading="invalidatingId === c.user_id"
                @click="invalidate(c.user_id)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
