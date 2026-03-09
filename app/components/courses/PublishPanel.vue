<script setup lang="ts">
interface Props {
  status: string
  loading?: boolean
  courseId?: string
  lessonCount?: number
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  lessonCount: 0
})

const emit = defineEmits<{
  'update:status': [value: string]
  'save': []
  'publish': []
}>()

const statusItems = Enum.StatusLearning.map(s => ({ label: s.label, value: s.value }))

const currentStatusColor = computed(() => {
  const s = Enum.StatusLearning.find(x => x.value === props.status)
  const colorMap: Record<string, string> = { neutral: 'neutral', success: 'success', warning: 'warning', error: 'error' }
  return colorMap[s?.color ?? 'neutral'] as 'neutral' | 'success' | 'warning' | 'error'
})
</script>

<template>
  <div class="sticky top-4 space-y-4">
    <UPageCard>
      <div class="space-y-4">
        <!-- Status -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-highlighted">Status</label>
          <div class="flex items-center gap-2">
            <UBadge :color="currentStatusColor" variant="subtle" class="capitalize">
              {{ Enum.StatusLearning.find(x => x.value === status)?.label ?? status }}
            </UBadge>
          </div>
          <USelect
            :model-value="status"
            :items="statusItems"
            class="w-full mt-1"
            @update:model-value="emit('update:status', $event)"
          />
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-2 pt-2">
          <UButton
            type="submit"
            class="w-full justify-center"
            :loading="loading"
            icon="i-lucide-save"
            label="Simpan"
          />
        </div>

        <!-- Lesson link (only when course already saved) -->
        <template v-if="courseId">
          <USeparator />
          <UButton
            :to="`/courses/${courseId}/lessons`"
            color="neutral"
            variant="outline"
            icon="i-lucide-layers"
            :label="`Kelola Lesson (${lessonCount})`"
            class="w-full justify-center"
          />
          <UButton
            :to="`/courses/${courseId}/preview`"
            color="neutral"
            variant="ghost"
            icon="i-lucide-eye"
            label="Lihat Preview"
            class="w-full justify-center"
          />
        </template>
      </div>
    </UPageCard>
  </div>
</template>
