<script setup lang="ts">
defineProps<{
  collapsed?: boolean
}>()
</script>

<template>
  <UButton
    :label="collapsed ? undefined : 'Jurutani'"
    color="neutral"
    variant="ghost"
    block
    :square="collapsed"
    class="pointer-events-none"
    :class="[!collapsed && 'py-2', !collapsed && 'justify-start']"
  >
    <template #leading>
      <img
        src="/jurutani.png"
        alt="Jurutani"
        class="w-5 h-5 object-contain"
      >
    </template>
  </UButton>
</template>
