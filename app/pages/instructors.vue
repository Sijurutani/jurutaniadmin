<script lang="ts" setup>
useHead({ title: 'Instructors – Jurutani Admin' })
</script>

<template>
  <UDashboardPanel id="instructors">
    <template #header>
      <UDashboardNavbar title="Instructors">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <ComingSoon
        icon="i-lucide-book-open"
        title="Instructors Coming Soon"
        description="Instructor management and assignment features are currently under development."
      />
    </template>
  </UDashboardPanel>
</template>
