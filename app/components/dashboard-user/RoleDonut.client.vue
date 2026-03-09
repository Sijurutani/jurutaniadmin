<script setup lang="ts">
import { VisSingleContainer, VisDonut } from '@unovis/vue'

const supabase = useSupabaseClient()

type RoleData = { role: string; label: string; count: number; cssColor: string; icon: string }

// Map Enum color names → CSS vars used in the Nuxt UI theme
const cssColorMap: Record<string, string> = {
  admin: 'var(--ui-info)',
  pakar: 'var(--ui-success)',
  penyuluh: 'var(--ui-warning)',
  petani: 'var(--ui-text-muted)'
}

const { data: roleData } = await useAsyncData('user-role-distribution', async () => {
  const results = await Promise.all(
    Enum.UserRole.map(r =>
      supabase.from('profiles')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('role', r.value)
    )
  )
  return Enum.UserRole.map((r, i) => ({
    role: r.value,
    label: r.label,
    count: results[i]?.count ?? 0,
    cssColor: cssColorMap[r.value] ?? 'var(--ui-primary)',
    icon: r.icon
  })) as RoleData[]
}, { default: () => [] as RoleData[] })

const totalUsers = computed(() => (roleData.value ?? []).reduce((s, r) => s + r.count, 0))

const value = (d: RoleData) => d.count
const color = (d: RoleData) => d.cssColor
</script>

<template>
  <UCard>
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">
          Distribusi Role
        </p>
        <div class="flex items-baseline gap-2">
          <p class="text-3xl text-highlighted font-semibold">
            {{ totalUsers.toLocaleString('id-ID') }}
          </p>
          <span class="text-sm font-normal text-muted">pengguna aktif</span>
        </div>
      </div>
    </template>

    <div class="flex flex-col gap-5">
      <!-- Donut chart -->
      <VisSingleContainer
        :data="roleData ?? []"
        :height="160"
      >
        <VisDonut :value="value" :color="color" :arc-width="42" />
      </VisSingleContainer>

      <!-- Legend table -->
      <div class="space-y-2.5">
        <div
          v-for="r in roleData"
          :key="r.role"
          class="flex items-center justify-between text-sm"
        >
          <div class="flex items-center gap-2.5">
            <span class="size-2.5 rounded-full shrink-0" :style="{ background: r.cssColor }" />
            <UIcon :name="r.icon" class="size-3.5 text-muted" />
            <span class="text-muted">{{ r.label }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-semibold text-highlighted tabular-nums">
              {{ r.count.toLocaleString('id-ID') }}
            </span>
            <span class="text-xs text-muted w-8 text-right tabular-nums">
              {{ totalUsers ? Math.round((r.count / totalUsers) * 100) : 0 }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>

<style scoped>
.unovis-single-container {
  --vis-donut-background-color: color-mix(in srgb, var(--ui-border) 40%, transparent);
}
</style>
