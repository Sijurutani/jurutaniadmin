<script setup lang="ts">
import type { Database } from '~/types/database.types'

type VideoRow = Database['public']['Tables']['videos']['Row']

const props = defineProps<{
  rows: VideoRow[]
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ deleted: [] }>()

const supabase = useSupabase()
const toast = useToast()
const loading = ref(false)

async function confirmDelete() {
  if (!props.rows.length) return
  loading.value = true
  try {
    const ids = props.rows.map(r => r.id)
    const { error } = await supabase.from('videos').delete().in('id', ids)
    if (error) throw error
    toast.add({ title: `${ids.length} video dihapus`, color: 'success', duration: 2000 })
    emit('deleted')
    open.value = false
  } catch (err: any) {
    toast.add({ title: 'Gagal menghapus', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Hapus ${rows.length} Video Secara Permanen?`"
    description="Tindakan ini tidak dapat dibatalkan. Data video akan dihapus dari sistem."
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <ul v-if="rows.length <= 5" class="space-y-1 mb-4">
        <li
          v-for="row in rows"
          :key="row.id"
          class="text-sm text-highlighted flex items-center gap-2"
        >
          <UIcon name="i-lucide-video" class="size-4 text-muted shrink-0" />
          {{ row.title }}
        </li>
      </ul>
      <p v-else class="text-sm text-muted mb-4">
        {{ rows.length }} video akan dihapus secara permanen.
      </p>
      <div class="flex justify-end gap-2">
        <UButton
          label="Batal"
          color="neutral"
          variant="subtle"
          :disabled="loading"
          @click="open = false"
        />
        <UButton
          label="Hapus Permanen"
          color="error"
          icon="i-lucide-trash-2"
          :loading="loading"
          @click="confirmDelete"
        />
      </div>
    </template>
  </UModal>
</template>
