<script setup lang="ts">
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  format,
  isSameDay,
  isSameWeek,
  isSameMonth
} from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { VisXYContainer, VisLine, VisArea, VisAxis, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { Period, Range } from '~/types'

const props = defineProps<{
  range: Range
  period: Period
}>()

const supabase = useSupabase()
const cardRef = useTemplateRef<HTMLElement | null>('cardRef')
const { width } = useElementSize(cardRef)

type RawProfile = { created_at: string }

const { data: rawProfiles } = await useAsyncData('user-registrations-chart', async () => {
  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', props.range.start.toISOString())
    .lte('created_at', props.range.end.toISOString())
    .is('deleted_at', null)
  return (data ?? []) as RawProfile[]
}, {
  default: () => [] as RawProfile[],
  watch: [() => props.range, () => props.period]
})

type DataRecord = { date: Date; count: number }

const chartData = computed<DataRecord[]>(() => {
  const profiles = rawProfiles.value ?? []
  let intervals: Date[]
  if (props.period === 'daily') intervals = eachDayOfInterval(props.range)
  else if (props.period === 'weekly') intervals = eachWeekOfInterval(props.range)
  else intervals = eachMonthOfInterval(props.range)

  return intervals.map((date: Date) => ({
    date,
    count: profiles.filter(p => {
      const d = new Date(p.created_at)
      if (props.period === 'daily') return isSameDay(d, date)
      if (props.period === 'weekly') return isSameWeek(d, date)
      return isSameMonth(d, date)
    }).length
  }))
})

const total = computed(() => (rawProfiles.value ?? []).length)

const x = (_: DataRecord, i: number) => i
const y = (d: DataRecord) => d.count

function formatDate(date: Date): string {
  return ({
    daily: format(date, 'd MMM', { locale: localeId }),
    weekly: format(date, 'd MMM', { locale: localeId }),
    monthly: format(date, 'MMM yyyy', { locale: localeId })
  })[props.period]
}

const xTicks = (i: number) => {
  if (i === 0 || i === chartData.value.length - 1) return ''
  const d = chartData.value[i]
  return d ? formatDate(d.date) : ''
}

const tooltip = (d: DataRecord) => `${formatDate(d.date)}: ${d.count} user baru`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">
          Registrasi Pengguna Baru
        </p>
        <div class="flex items-baseline gap-2">
          <p class="text-3xl text-highlighted font-semibold">
            {{ total.toLocaleString('id-ID') }}
          </p>
          <span class="text-sm font-normal text-muted">dalam periode ini</span>
        </div>
      </div>
    </template>

    <div v-if="chartData.length === 0" class="h-72 flex items-center justify-center text-muted text-sm">
      Tidak ada data registrasi dalam periode ini
    </div>

    <VisXYContainer
      v-else
      :data="chartData"
      :padding="{ top: 40 }"
      class="h-72"
      :width="width"
    >
      <VisLine :x="x" :y="y" color="var(--ui-primary)" />
      <VisArea :x="x" :y="y" color="var(--ui-primary)" :opacity="0.1" />
      <VisAxis type="x" :x="x" :tick-format="xTicks" />
      <VisCrosshair color="var(--ui-primary)" :template="tooltip" />
      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);
  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);
  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
