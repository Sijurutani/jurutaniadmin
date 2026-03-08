<script setup lang="ts">
const supabase = useSupabase()

const now = new Date()
const todayStr = now.toISOString().split('T')[0]!
const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0]!

// Month ranges
const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()
const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
const lastMonthPrefix = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

function growthPct(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}

const { data: kpi } = await useAsyncData('dashboard-kpi', async () => {
  const [
    totalUsersRes,
    newUsersThisMonth,
    newUsersLastMonth,
    visitsToday,
    visitsYesterday,
    visitsThisMonth,
    visitsLastMonth,
    approvedNewsRes,
    approvedCoursesRes,
    approvedProductsRes,
    pendingNewsRes,
    pendingCoursesRes,
    pendingProductsRes
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).not('role', 'in', '("admin","superadmin")').is('deleted_at', null),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thisMonthStart).not('role', 'in', '("admin","superadmin")').is('deleted_at', null),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', lastMonthStart).lte('created_at', lastMonthEnd).not('role', 'in', '("admin","superadmin")').is('deleted_at', null),
    supabase.from('visit_stats').select('count').eq('date', todayStr).maybeSingle(),
    supabase.from('visit_stats').select('count').eq('date', yesterdayStr).maybeSingle(),
    supabase.from('visit_stats').select('count').like('date', `${thisMonthPrefix}%`),
    supabase.from('visit_stats').select('count').like('date', `${lastMonthPrefix}%`),
    supabase.from('news_updated').select('*', { count: 'exact', head: true }).eq('status_news', 'approved').is('deleted_at', null),
    supabase.from('learning_courses').select('*', { count: 'exact', head: true }).eq('status', 'approved').is('deleted_at', null),
    supabase.from('product_markets').select('*', { count: 'exact', head: true }).eq('status', 'approved').is('deleted_at', null),
    supabase.from('news_updated').select('*', { count: 'exact', head: true }).eq('status_news', 'pending').is('deleted_at', null),
    supabase.from('learning_courses').select('*', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null),
    supabase.from('product_markets').select('*', { count: 'exact', head: true }).eq('status', 'pending').is('deleted_at', null)
  ])

  const sum = (rows: { count: number }[] | null) => (rows ?? []).reduce((a, r) => a + r.count, 0)

  const totalUsers = totalUsersRes.count ?? 0
  const newThis = newUsersThisMonth.count ?? 0
  const newLast = newUsersLastMonth.count ?? 0

  const visitToday = visitsToday.data?.count ?? 0
  const visitYesterday = visitsYesterday.data?.count ?? 0

  const visitMonth = sum(visitsThisMonth.data)
  const visitLastM = sum(visitsLastMonth.data)

  const activeContent = (approvedNewsRes.count ?? 0) + (approvedCoursesRes.count ?? 0) + (approvedProductsRes.count ?? 0)

  const totalPending = (pendingNewsRes.count ?? 0) + (pendingCoursesRes.count ?? 0) + (pendingProductsRes.count ?? 0)

  return {
    users: {
      value: totalUsers,
      delta: newThis,
      growth: growthPct(newThis, newLast),
      label: 'Total Pengguna',
      sub: `+${newThis} baru bulan ini`,
      icon: 'i-lucide-users',
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950'
    },
    visits: {
      value: visitToday,
      monthTotal: visitMonth,
      growth: growthPct(visitMonth, visitLastM),
      label: 'Kunjungan Hari Ini',
      sub: visitMonth.toLocaleString('id-ID') + ' bulan ini',
      icon: 'i-lucide-eye',
      color: 'text-indigo-500',
      bg: 'bg-indigo-50 dark:bg-indigo-950'
    },
    content: {
      value: activeContent,
      growth: null as number | null,
      label: 'Konten Aktif',
      sub: `${approvedNewsRes.count ?? 0} berita · ${approvedCoursesRes.count ?? 0} kursus · ${approvedProductsRes.count ?? 0} produk`,
      icon: 'i-lucide-layout-grid',
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-950'
    },
    pending: {
      value: totalPending,
      growth: null as number | null,
      label: 'Menunggu Review',
      sub: `${pendingNewsRes.count ?? 0} berita · ${pendingCoursesRes.count ?? 0} kursus · ${pendingProductsRes.count ?? 0} produk`,
      icon: 'i-lucide-clock',
      color: totalPending > 0 ? 'text-orange-500' : 'text-muted',
      bg: totalPending > 0 ? 'bg-orange-50 dark:bg-orange-950' : 'bg-default'
    }
  }
}, { default: () => null })
</script>

<template>
  <div
    v-if="!kpi"
    class="grid grid-cols-2 xl:grid-cols-4 gap-4"
  >
    <USkeleton
      v-for="i in 4"
      :key="i"
      class="h-28 rounded-xl"
    />
  </div>

  <div
    v-else
    class="grid grid-cols-2 xl:grid-cols-4 gap-4"
  >
    <!-- Users -->
    <NuxtLink to="/users">
      <UCard
        class="hover:ring-2 hover:ring-primary transition-all cursor-pointer"
        :ui="{ body: 'flex items-start gap-4' }"
      >
        <div :class="['rounded-xl p-3 shrink-0', kpi.users.bg]">
          <UIcon
            :name="kpi.users.icon"
            :class="['size-5', kpi.users.color]"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs text-muted mb-1">
            {{ kpi.users.label }}
          </p>
          <p class="text-2xl font-bold text-highlighted leading-none mb-1">
            {{ kpi.users.value.toLocaleString('id-ID') }}
          </p>
          <div class="flex items-center gap-1.5">
            <UBadge
              :color="kpi.users.growth >= 0 ? 'success' : 'error'"
              variant="subtle"
              size="sm"
            >
              <UIcon
                :name="kpi.users.growth >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                class="size-3 mr-0.5"
              />
              {{ kpi.users.growth >= 0 ? '+' : '' }}{{ kpi.users.growth }}%
            </UBadge>
            <span class="text-xs text-muted truncate">vs bln lalu</span>
          </div>
        </div>
      </UCard>
    </NuxtLink>

    <!-- Visits -->
    <UCard :ui="{ body: 'flex items-start gap-4' }">
      <div :class="['rounded-xl p-3 shrink-0', kpi.visits.bg]">
        <UIcon
          :name="kpi.visits.icon"
          :class="['size-5', kpi.visits.color]"
        />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-xs text-muted mb-1">
          {{ kpi.visits.label }}
        </p>
        <p class="text-2xl font-bold text-highlighted leading-none mb-1">
          {{ kpi.visits.value.toLocaleString('id-ID') }}
        </p>
        <div class="flex items-center gap-1.5">
          <UBadge
            :color="kpi.visits.growth >= 0 ? 'success' : 'error'"
            variant="subtle"
            size="sm"
          >
            <UIcon
              :name="kpi.visits.growth >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
              class="size-3 mr-0.5"
            />
            {{ kpi.visits.growth >= 0 ? '+' : '' }}{{ kpi.visits.growth }}%
          </UBadge>
          <span class="text-xs text-muted truncate">vs bln lalu</span>
        </div>
      </div>
    </UCard>

    <!-- Active Content -->
    <UCard :ui="{ body: 'flex items-start gap-4' }">
      <div :class="['rounded-xl p-3 shrink-0', kpi.content.bg]">
        <UIcon
          :name="kpi.content.icon"
          :class="['size-5', kpi.content.color]"
        />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-xs text-muted mb-1">
          {{ kpi.content.label }}
        </p>
        <p class="text-2xl font-bold text-highlighted leading-none mb-1.5">
          {{ kpi.content.value.toLocaleString('id-ID') }}
        </p>
        <p class="text-xs text-muted truncate">
          {{ kpi.content.sub }}
        </p>
      </div>
    </UCard>

    <!-- Pending Review -->
    <UCard
      :class="kpi.pending.value > 0 ? 'ring-2 ring-orange-300 dark:ring-orange-700' : ''"
      :ui="{ body: 'flex items-start gap-4' }"
    >
      <div :class="['rounded-xl p-3 shrink-0', kpi.pending.bg]">
        <UIcon
          :name="kpi.pending.icon"
          :class="['size-5', kpi.pending.color]"
        />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-xs text-muted mb-1">
          {{ kpi.pending.label }}
        </p>
        <div class="flex items-center gap-2 mb-1">
          <p
            class="text-2xl font-bold leading-none"
            :class="kpi.pending.value > 0 ? 'text-orange-500' : 'text-highlighted'"
          >
            {{ kpi.pending.value }}
          </p>
          <UBadge
            v-if="kpi.pending.value > 0"
            color="warning"
            variant="subtle"
            size="sm"
          >
            Perlu aksi
          </UBadge>
        </div>
        <p class="text-xs text-muted truncate">
          {{ kpi.pending.sub }}
        </p>
      </div>
    </UCard>
  </div>
</template>
