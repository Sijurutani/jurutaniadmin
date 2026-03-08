<script setup lang="ts">
const route = useRoute()
const userId = route.params.id as string
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <UPageCard
        title="Expert Status"
        description="Whether this user is registered as an agricultural expert."
        variant="naked"
        orientation="horizontal"
        class="mb-4"
      />
      <UsersExpertSection :user-id="userId" />
    </div>

    <div>
      <UPageCard
        title="Instructor Status"
        description="Whether this user is registered as a field instructor (penyuluh)."
        variant="naked"
        orientation="horizontal"
        class="mb-4"
      />
      <UsersInstructorSection :user-id="userId" />
    </div>
  </div>
</template>
