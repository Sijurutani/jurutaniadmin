<script setup lang="ts">
const route = useRoute()
const userId = route.params.id as string
</script>

<template>
  <div>
    <UPageCard
      title="Market Products"
      description="Products listed on the marketplace by this user."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    />
    <UsersMarketsSection :user-id="userId" />
  </div>
</template>
