<script setup lang="ts">
import { format, sub, eachDayOfInterval } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue'

const supabase = useSupabaseClient()
const cardRef = useTemplateRef<HTMLElement | null>('cardRef')
const { width } = useElementSize(cardRef)

type DataRecord = { date: Date, count: number }
type Period = '7d' | '30d' | '90d'

const period = ref<Period>('30d')

const periodOptions: { label: string, value: Period }[] = [
  { label: '7 Hari', value: '7d' },
  { label: '30 Hari', value: '30d' },
  { label: '90 Hari', value: '90d' }
]

const days = computed(() => ({
  '7d': 6,
  '30d': 29,
  '90d': 89
}[period.value]))

const { data: visitData, refresh } = await useAsyncData('visit-stats-chart', async () => {
  const maxDays = 89
  const from = format(sub(new Date(), { days: maxDays }), 'yyyy-MM-dd')
  const { data } = await supabase
    .from('visit_stats')
    .select('count, date')
    .gte('date', from)
    .order('date', { ascending: true })
  return data ?? []
}, { default: () => [] })

const data = computed<DataRecord[]>(() => {
  const interval = eachDayOfInterval({ start: sub(new Date(), { days: days.value }), end: new Date() })
  const map = new Map((visitData.value ?? []).map(r => [r.date, r.count]))
  return interval.map(d => ({
    date: d,
    count: map.get(format(d, 'yyyy-MM-dd')) ?? 0
  }))
})

const total = computed(() => data.value.reduce((acc, { count }) => acc + count, 0))
const avg = computed(() => data.value.length ? Math.round(total.value / data.value.length) : 0)
const peak = computed(() => Math.max(...data.value.map(d => d.count), 0))

const x = (_: DataRecord, i: number) => i
const y = (d: DataRecord) => d.count

const tickStep = computed(() => Math.max(1, Math.floor(data.value.length / 6)))

const xTicks = (i: number) => {
  if (!data.value[i]) return ''
  if (i % tickStep.value !== 0 && i !== data.value.length - 1) return ''
  return format(data.value[i]!.date, 'd MMM', { locale: idLocale })
}

const template = (d: DataRecord) =>
  `${format(d.date, 'd MMM yyyy', { locale: idLocale })}: ${d.count.toLocaleString('id-ID')} kunjungan`
</script>

<template>
  <UCard
    ref="cardRef"
    :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3', header: 'pb-2' }"
  >
    <template #header>
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p class="text-xs text-muted uppercase mb-1">
            Tren Kunjungan
          </p>
          <p class="text-3xl text-highlighted font-bold leading-none">
            {{ total.toLocaleString('id-ID') }}
          </p>
        </div>
        <div class="flex items-center gap-4">
          <div class="hidden sm:flex gap-4 text-center">
            <div>
              <p class="text-xs text-muted">
                Rata-rata/hari
              </p>
              <p class="text-sm font-semibold text-highlighted">
                {{ avg.toLocaleString('id-ID') }}
              </p>
            </div>
            <div>
              <p class="text-xs text-muted">
                Puncak
              </p>
              <p class="text-sm font-semibold text-highlighted">
                {{ peak.toLocaleString('id-ID') }}
              </p>
            </div>
          </div>
          <UFieldGroup size="xs">
            <UButton
              v-for="opt in periodOptions"
              :key="opt.value"
              :label="opt.label"
              :color="period === opt.value ? 'primary' : 'neutral'"
              :variant="period === opt.value ? 'solid' : 'ghost'"
              @click="period = opt.value"
            />
          </UFieldGroup>
        </div>
      </div>
    </template>

    <VisXYContainer
      :data="data"
      :padding="{ top: 16, left: 8, right: 8 }"
      class="h-56"
      :width="width"
    >
      <VisLine
        :x="x"
        :y="y"
        color="var(--ui-primary)"
      />
      <VisArea
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :opacity="0.08"
      />
      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />
      <VisCrosshair
        color="var(--ui-primary)"
        :template="template"
      />
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

