<script lang="ts" setup>
useHead({ title: 'Users – Jurutani Admin' })
</script>

<template>
  <UDashboardPanel id="users">
    <template #header>
      <UDashboardNavbar title="Users">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <ComingSoon
        icon="i-lucide-users"
        title="Users Coming Soon"
        description="User management and administration features are currently under development."
      />
    </template>
  </UDashboardPanel>
</template>
