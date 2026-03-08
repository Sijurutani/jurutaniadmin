<script setup lang="ts">
const props = defineProps<{
  ratings: { rating: number }[]
}>()

const average = computed(() => {
  if (!props.ratings.length) return 0
  const sum = props.ratings.reduce((acc, r) => acc + r.rating, 0)
  return Math.round((sum / props.ratings.length) * 10) / 10
})

const breakdown = computed(() => {
  const counts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: props.ratings.filter(r => r.rating === star).length
  }))
  return counts
})

const maxCount = computed(() => Math.max(...breakdown.value.map(b => b.count), 1))

function starFill(avg: number, pos: number): 'full' | 'half' | 'empty' {
  const diff = avg - pos + 1
  if (diff >= 1) return 'full'
  if (diff >= 0.5) return 'half'
  return 'empty'
}
</script>

<template>
  <div class="space-y-3">
    <!-- Average score -->
    <div class="flex items-center gap-4">
      <div class="text-center">
        <div class="text-4xl font-bold text-highlighted leading-none">{{ average }}</div>
        <div class="text-xs text-muted mt-1">dari 5</div>
      </div>
      <div class="space-y-1">
        <!-- Star display -->
        <div class="flex gap-0.5">
          <UIcon
            v-for="pos in 5"
            :key="pos"
            :name="starFill(average, pos) === 'full' ? 'i-lucide-star' : starFill(average, pos) === 'half' ? 'i-lucide-star-half' : 'i-lucide-star'"
            :class="[
              'size-5',
              starFill(average, pos) === 'empty' ? 'text-muted' : 'text-yellow-400',
              starFill(average, pos) === 'full' ? 'fill-yellow-400' : starFill(average, pos) === 'half' ? 'fill-yellow-400' : 'fill-none'
            ]"
          />
        </div>
        <div class="text-sm text-muted">{{ ratings.length }} ulasan</div>
      </div>
    </div>

    <!-- Breakdown bars -->
    <div v-if="ratings.length > 0" class="space-y-1.5">
      <div
        v-for="b in breakdown"
        :key="b.star"
        class="flex items-center gap-2 text-xs"
      >
        <div class="flex gap-0.5 w-20 shrink-0">
          <template v-for="s in 5" :key="s">
            <UIcon
              name="i-lucide-star"
              :class="['size-3', s <= b.star ? 'text-yellow-400 fill-yellow-400' : 'text-muted fill-none']"
            />
          </template>
        </div>
        <div class="flex-1 h-2 bg-elevated rounded-full overflow-hidden">
          <div
            class="h-full bg-yellow-400 rounded-full transition-all duration-500"
            :style="{ width: `${(b.count / maxCount) * 100}%` }"
          />
        </div>
        <div class="w-6 text-right tabular-nums text-muted">{{ b.count }}</div>
      </div>
    </div>

    <div v-else class="text-sm text-muted text-center py-2">
      Belum ada ulasan
    </div>
  </div>
</template>
