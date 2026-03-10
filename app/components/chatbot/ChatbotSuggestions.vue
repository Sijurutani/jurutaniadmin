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
  <div class="flex flex-wrap gap-2 px-2 pb-1 justify-center">
    <button
      v-for="s in suggestions"
      :key="s.label"
      class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full border border-gray-700 bg-gray-800/60 text-gray-300 hover:bg-gray-700 hover:border-gray-500 hover:text-white transition-all"
      @click="emit('select', s.label)"
    >
      <UIcon :name="s.icon" class="size-3.5 text-gray-400" />
      {{ s.label }}
    </button>
  </div>
</template>
