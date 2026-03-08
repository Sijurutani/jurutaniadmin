<script setup lang="ts">
import { differenceInDays, differenceInHours, isPast } from 'date-fns'

interface Props {
  lesson: {
    id: string
    title: string
    status: string
    published_at: string | null
    order_index: number
  }
  active?: boolean
  index: number
}

const props = defineProps<Props>()
defineEmits<{ select: []; delete: [] }>()

const dripLabel = computed(() => {
  if (!props.lesson.published_at) return null
  const date = new Date(props.lesson.published_at)
  if (isPast(date)) return null
  const days = differenceInDays(date, new Date())
  if (days > 0) return `Rilis dalam ${days} hari`
  const hours = differenceInHours(date, new Date())
  return `Rilis dalam ${hours} jam`
})

const statusDot = computed(() => {
  switch (props.lesson.status) {
    case 'approved': return props.lesson.published_at && isPast(new Date(props.lesson.published_at))
      ? { icon: 'i-lucide-circle-check', class: 'text-success-500' }
      : { icon: 'i-lucide-clock', class: 'text-warning-500' }
    case 'pending': return { icon: 'i-lucide-circle', class: 'text-muted' }
    case 'rejected': return { icon: 'i-lucide-circle-x', class: 'text-error-500' }
    case 'archived': return { icon: 'i-lucide-archive', class: 'text-muted' }
    default: return { icon: 'i-lucide-circle', class: 'text-muted' }
  }
})
</script>

<template>
  <div
    class="group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
    :class="active ? 'bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800' : 'hover:bg-elevated border border-transparent'"
    @click="$emit('select')"
  >
    <!-- Drag handle -->
    <button
      class="drag-handle cursor-grab shrink-0 text-muted opacity-0 group-hover:opacity-100 transition-opacity"
      title="Geser untuk mengurutkan"
    >
      <UIcon name="i-lucide-grip-vertical" class="size-4" />
    </button>

    <!-- Order number -->
    <span class="text-xs font-mono text-muted w-5 shrink-0 text-center">{{ index + 1 }}</span>

    <!-- Status dot -->
    <UIcon :name="statusDot.icon" class="size-3.5 shrink-0" :class="statusDot.class" />

    <!-- Title + drip -->
    <div class="flex-1 min-w-0">
      <p class="text-sm truncate" :class="active ? 'font-semibold text-primary-600 dark:text-primary-400' : 'text-highlighted'">
        {{ lesson.title }}
      </p>
      <p v-if="dripLabel" class="text-xs text-warning-500 flex items-center gap-1 mt-0.5">
        <UIcon name="i-lucide-timer" class="size-3" />
        {{ dripLabel }}
      </p>
    </div>

    <!-- Delete (hover only) -->
    <UButton
      icon="i-lucide-trash-2"
      size="xs"
      color="error"
      variant="ghost"
      class="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      @click.stop="$emit('delete')"
    />
  </div>
</template>
