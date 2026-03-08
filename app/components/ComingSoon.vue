<script lang="ts" setup>
defineProps<{
  title?: string
  description?: string
  icon?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center flex-1 gap-6 py-24 text-center select-none">
    <div class="flex items-center justify-center size-20 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
      <UIcon :name="icon ?? 'i-lucide-construction'" class="size-10" />
    </div>
    <div class="space-y-2 max-w-sm">
      <h2 class="text-2xl font-semibold text-highlighted tracking-tight">
        {{ title ?? 'Coming Soon' }}
      </h2>
      <p class="text-sm text-muted leading-relaxed">
        {{ description ?? 'This feature is currently under development. Check back soon!' }}
      </p>
    </div>
    <UBadge
      color="primary"
      variant="subtle"
      icon="i-lucide-clock"
      label="In Development"
    />
  </div>
</template>
