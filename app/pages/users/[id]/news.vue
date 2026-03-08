<script setup lang="ts">
const route = useRoute()
const userId = route.params.id as string
</script>

<template>
  <div>
    <UPageCard
      title="Published Articles"
      description="News articles authored by this user."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    />
    <UsersNewsSection :user-id="userId" />
  </div>
</template>
