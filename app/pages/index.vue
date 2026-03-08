<script setup lang="ts">
const { isNotificationsSlideoverOpen } = useDashboard()
const auth = useAuth()

const today = new Date().toLocaleDateString('id-ID', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})

const refreshKey = ref(0)
const refreshing = ref(false)

async function doRefresh() {
  refreshing.value = true
  refreshKey.value++
  await nextTick()
  setTimeout(() => { refreshing.value = false }, 500)
}
</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
          <div class="flex flex-col ml-1">
            <h1 class="text-base font-bold text-highlighted leading-tight">
              Halo, {{ auth.displayName }}! 👋
            </h1>
            <p class="text-xs text-muted">
              {{ today }}
            </p>
          </div>
        </template>

        <template #right>
          <UTooltip text="Refresh data">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-refresh-cw"
              square
              :loading="refreshing"
              @click="doRefresh"
            />
          </UTooltip>
          <UTooltip
            text="Notifikasi"
            :shortcuts="['N']"
          >
            <UButton
              color="neutral"
              variant="ghost"
              square
              @click="isNotificationsSlideoverOpen = true"
            >
              <UChip
                color="error"
                inset
              >
                <UIcon
                  name="i-lucide-bell"
                  class="size-5 shrink-0"
                />
              </UChip>
            </UButton>
          </UTooltip>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-6">
        <!-- KPI Stats -->
        <HomeStats :key="refreshKey" />

        <!-- Chart + Pending Content -->
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div class="xl:col-span-2">
            <HomeChart />
          </div>
          <HomePendingContent :key="refreshKey" />
        </div>

        <!-- Recent Users + Recent Activity -->
        <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div class="xl:col-span-3">
            <HomeRecentUsers :key="refreshKey" />
          </div>
          <div class="xl:col-span-2">
            <HomeRecentActivity :key="refreshKey" />
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
