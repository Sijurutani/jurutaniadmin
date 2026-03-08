<script lang="ts" setup>
useHead({ title: 'User Dashboard – Jurutani Admin' })
</script>

<template>
  <UDashboardPanel id="dashboard-user">
    <template #header>
      <UDashboardNavbar title="User Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <ComingSoon
        icon="i-lucide-chart-spline"
        title="User Dashboard Coming Soon"
        description="User analytics and dashboard features are currently under development."
      />
    </template>
  </UDashboardPanel>
</template>
