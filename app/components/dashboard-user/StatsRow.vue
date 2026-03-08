<script setup lang="ts">
import type { Range } from '~/types'

const props = defineProps<{ range: Range }>()

const supabase = useSupabase()

const { data: stats } = await useAsyncData('user-dashboard-stats', async () => {
  const [total, petani, pakar, penyuluh, adminRes, newInRange, deletedRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null).is('archived_at', null),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('role', 'petani'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('role', 'pakar'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('role', 'penyuluh'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('is_admin', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', props.range.start.toISOString())
      .lte('created_at', props.range.end.toISOString()),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).not('deleted_at', 'is', null)
  ])
  return {
    total: total.count ?? 0,
    petani: petani.count ?? 0,
    pakar: pakar.count ?? 0,
    penyuluh: penyuluh.count ?? 0,
    adminCount: adminRes.count ?? 0,
    newInRange: newInRange.count ?? 0,
    deleted: deletedRes.count ?? 0
  }
}, {
  default: () => ({ total: 0, petani: 0, pakar: 0, penyuluh: 0, adminCount: 0, newInRange: 0, deleted: 0 }),
  watch: [() => props.range]
})

const cards = computed(() => [
  {
    title: 'Total Pengguna Aktif',
    icon: 'i-lucide-users',
    value: stats.value.total,
    badge: `+${stats.value.newInRange} baru`,
    badgeColor: stats.value.newInRange > 0 ? 'success' : 'neutral'
  },
  {
    title: 'Petani',
    icon: 'i-lucide-user',
    value: stats.value.petani,
    badge: `${stats.value.total ? Math.round((stats.value.petani / stats.value.total) * 100) : 0}%`,
    badgeColor: 'neutral'
  },
  {
    title: 'Pakar',
    icon: 'i-lucide-brain',
    value: stats.value.pakar,
    badge: `${stats.value.total ? Math.round((stats.value.pakar / stats.value.total) * 100) : 0}%`,
    badgeColor: 'success'
  },
  {
    title: 'Penyuluh',
    icon: 'i-lucide-book-open',
    value: stats.value.penyuluh,
    badge: `${stats.value.total ? Math.round((stats.value.penyuluh / stats.value.total) * 100) : 0}%`,
    badgeColor: 'warning'
  },
  {
    title: 'Admin',
    icon: 'i-lucide-shield-check',
    value: stats.value.adminCount,
    badge: `${stats.value.deleted} dihapus`,
    badgeColor: 'info'
  }
] as const)
</script>

<template>
  <UPageGrid class="lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="(card, index) in cards"
      :key="index"
      :icon="card.icon"
      :title="card.title"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ card.value.toLocaleString('id-ID') }}
        </span>
        <UBadge :color="card.badgeColor as any" variant="subtle" class="text-xs">
          {{ card.badge }}
        </UBadge>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
