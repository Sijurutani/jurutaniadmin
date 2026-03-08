<script setup lang="ts">
import { sub } from 'date-fns'
import type { Period, Range } from '~/types'

useHead({ title: 'User Dashboard – Jurutani Admin' })

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 30 }),
  end: new Date()
})

const period = ref<Period>('daily')
</script>

<template>
  <UDashboardPanel id="dashboard-user">
    <template #header>
      <UDashboardNavbar title="User Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <HomeDateRangePicker v-model="range" class="-ms-1" />
          <HomePeriodSelect v-model="period" :range="range" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <!-- Stats row -->
      <DashboardUserStatsRow :range="range" />

      <!-- Charts row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
        <div class="lg:col-span-2">
          <DashboardUserRegistrationsChart :range="range" :period="period" />
        </div>
        <DashboardUserRoleDonut />
      </div>

      <!-- Recent users -->
      <div class="mt-6">
        <DashboardUserRecentList />
      </div>
    </template>
  </UDashboardPanel>
</template>
