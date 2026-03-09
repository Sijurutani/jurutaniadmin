<script setup lang="ts">
const emit = defineEmits<{
  select: [text: string]
}>()

const suggestions = [
  { label: 'Ringkasan hari ini', icon: 'i-lucide-sun' },
  { label: 'Konten pending review', icon: 'i-lucide-clock' },
  { label: 'User terbaru mendaftar', icon: 'i-lucide-users' },
  { label: 'Kursus belum dipublish', icon: 'i-lucide-book-open' }
]
</script>

<template>
  <div class="flex flex-wrap gap-2 px-3 pb-2">
    <UButton
      v-for="s in suggestions"
      :key="s.label"
      :label="s.label"
      :icon="s.icon"
      size="xs"
      color="neutral"
      variant="outline"
      @click="emit('select', s.label)"
    />
  </div>
</template>
