<script lang="ts" setup>
useHead({ title: 'Experts – Jurutani Admin' })
</script>

<template>
  <UDashboardPanel id="experts">
    <template #header>
      <UDashboardNavbar title="Experts">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <ComingSoon
        icon="i-lucide-brain"
        title="Experts Coming Soon"
        description="Expert management and directory features are currently under development."
      />
    </template>
  </UDashboardPanel>
</template>
