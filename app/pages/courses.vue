<script lang="ts" setup>
useHead({ title: 'Courses – Jurutani Admin' })
</script>

<template>
  <UDashboardPanel id="courses">
    <template #header>
      <UDashboardNavbar title="Courses">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <ComingSoon
        icon="i-lucide-book-open"
        title="Courses Coming Soon"
        description="Course creation and management features are currently under development."
      />
    </template>
  </UDashboardPanel>
</template>
