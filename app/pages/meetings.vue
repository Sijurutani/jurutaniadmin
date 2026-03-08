<script lang="ts" setup>
useHead({ title: 'Meetings – Jurutani Admin' })
</script>

<template>
  <UDashboardPanel id="meetings">
    <template #header>
      <UDashboardNavbar title="Meetings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <ComingSoon
        icon="i-lucide-calendar"
        title="Meetings Coming Soon"
        description="Meeting scheduling and management features are currently under development."
      />
    </template>
  </UDashboardPanel>
</template>
