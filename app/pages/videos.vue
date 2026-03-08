<script lang="ts" setup>
useHead({ title: 'Videos – Jurutani Admin' })
</script>

<template>
  <UDashboardPanel id="videos">
    <template #header>
      <UDashboardNavbar title="Videos">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <ComingSoon
        icon="i-lucide-video"
        title="Videos Coming Soon"
        description="Video management and streaming features are currently under development."
      />
    </template>
  </UDashboardPanel>
</template>
