<script setup lang="ts">
import type { Database } from '~/types/database.types'

type InstructorRow = Database['public']['Tables']['instructors']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type InstructorWithProfile = InstructorRow & {
  profile: Pick<ProfileRow, 'id' | 'full_name' | 'username' | 'email' | 'avatar_url' | 'role' | 'phone' | 'bio' | 'address' | 'birth_date' | 'website'> | null
}

const props = defineProps<{ targets: InstructorWithProfile[] }>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ deleted: [] }>()

const supabase = useSupabase()
const toast = useToast()

const loading = ref(false)
const hardDeleteConfirm = ref('')
const deleteMode = ref<'soft' | 'hard'>('soft')

const confirmText = computed(() =>
  props.targets.length === 1
    ? (props.targets[0]?.profile?.full_name ?? String(props.targets[0]?.id))
    : String(props.targets.length)
)

watch(open, (v) => {
  if (!v) { hardDeleteConfirm.value = ''; deleteMode.value = 'soft' }
})

async function onDelete() {
  if (!props.targets.length) return
  loading.value = true
  const ids = props.targets.map(t => t.id)
  try {
    if (deleteMode.value === 'hard') {
      const { error } = await supabase.from('instructors').delete().in('id', ids)
      if (error) throw error
      toast.add({ title: `${ids.length} penyuluh dihapus permanen`, color: 'success', duration: 2000 })
    } else {
      const { error } = await supabase.from('instructors')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', ids)
      if (error) throw error
      toast.add({ title: `${ids.length} penyuluh dihapus`, color: 'success', duration: 2000 })
    }
    open.value = false
    emit('deleted')
  } catch (err: any) {
    toast.add({ title: 'Gagal menghapus', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const canConfirmHard = computed(() =>
  deleteMode.value === 'soft' || hardDeleteConfirm.value === confirmText.value
)
</script>

<template>
  <UModal v-model:open="open" :ui="{ content: 'max-w-md' }">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="size-9 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-trash-2" class="size-5 text-error" />
        </div>
        <div>
          <p class="font-semibold text-highlighted">Hapus Penyuluh</p>
          <p class="text-xs text-muted">{{ targets.length }} penyuluh dipilih</p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-2">
          <button
            class="flex flex-col gap-1 p-3 rounded-lg border text-left transition-all"
            :class="deleteMode === 'soft' ? 'border-warning bg-warning/5 ring-1 ring-warning' : 'border-default hover:bg-elevated'"
            @click="deleteMode = 'soft'"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-archive" class="size-4 text-warning" />
              <span class="text-sm font-medium text-highlighted">Soft Delete</span>
            </div>
            <p class="text-xs text-muted">Data bisa dipulihkan kembali</p>
          </button>
          <button
            class="flex flex-col gap-1 p-3 rounded-lg border text-left transition-all"
            :class="deleteMode === 'hard' ? 'border-error bg-error/5 ring-1 ring-error' : 'border-default hover:bg-elevated'"
            @click="deleteMode = 'hard'"
          >
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-trash-2" class="size-4 text-error" />
              <span class="text-sm font-medium text-highlighted">Hard Delete</span>
            </div>
            <p class="text-xs text-muted">Dihapus permanen dari database</p>
          </button>
        </div>

        <div v-if="deleteMode === 'hard'" class="space-y-2 p-3 rounded-lg bg-error/5 border border-error/20">
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-alert-triangle" class="size-4 text-error mt-0.5 shrink-0" />
            <p class="text-xs text-error leading-relaxed">
              Tindakan ini <strong>tidak dapat dibatalkan</strong>. Data penyuluh akan dihapus secara permanen dari database.
            </p>
          </div>
          <p class="text-xs text-muted">
            Ketik <strong class="text-highlighted font-mono">{{ confirmText }}</strong> untuk konfirmasi:
          </p>
          <UInput v-model="hardDeleteConfirm" :placeholder="confirmText" class="w-full" color="error" />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Batal" color="neutral" variant="subtle" @click="open = false" />
        <UButton
          :label="deleteMode === 'hard' ? 'Hapus Permanen' : 'Hapus'"
          :color="deleteMode === 'hard' ? 'error' : 'warning'"
          :icon="deleteMode === 'hard' ? 'i-lucide-trash-2' : 'i-lucide-archive'"
          :loading="loading"
          :disabled="!canConfirmHard"
          @click="onDelete"
        />
      </div>
    </template>
  </UModal>
</template>
