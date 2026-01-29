<script setup lang="ts">
import type { MyKpi, PointTransaction } from '~/types/api'
import type { DataTableColumn } from '~/components/ui/DataTable.vue'
import { hexFor } from '~/utils/enums'
import { currentPeriod } from '~/utils/dates'

const props = withDefaults(defineProps<{ userId?: string | null; title?: string }>(), { userId: null, title: '' })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const format = useFormat()
const enumLabel = useEnumLabel()

const period = ref(currentPeriod())
const kpi = ref<MyKpi | null>(null)
const loading = ref(false)

const load = async () => {
  loading.value = true
  try {
    const path = props.userId ? `/kpi/users/${props.userId}` : '/kpi/me'
    kpi.value = await api.get<MyKpi>(path, { year: period.value.year, month: period.value.month })
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}

watch([period, () => props.userId], load, { immediate: true, deep: true })

const breakdownChart = computed(() => {
  const breakdown = kpi.value?.breakdown
  if (!breakdown) return { labels: [], values: [], colors: [] }
  const entries = [
    { source: 'TASK', value: breakdown.task },
    { source: 'BONUS_TASK', value: breakdown.bonusTask },
    { source: 'DAILY_REPORT', value: breakdown.dailyReport },
    { source: 'MANUAL', value: breakdown.manual },
  ].filter((entry) => entry.value !== 0)
  return { labels: entries.map((entry) => enumLabel('PointSource', entry.source)), values: entries.map((entry) => Math.abs(entry.value)), colors: entries.map((entry) => hexFor('PointSource', entry.source)) }
})

const history = computed(() => {
  const sorted = [...(kpi.value?.history ?? [])].sort((a, b) => a.year - b.year || a.month - b.month)
  return {
    labels: sorted.map((row) => `${format.monthName(row.month).slice(0, 3)} ${String(row.year).slice(2)}`),
    datasets: [
      { label: t('kpi.taskPoints'), data: sorted.map((row) => row.taskPoints), color: hexFor('PointSource', 'TASK') },
      { label: t('kpi.bonusPoints'), data: sorted.map((row) => row.bonusPoints), color: hexFor('PointSource', 'BONUS_TASK') },
      { label: t('kpi.reportPoints'), data: sorted.map((row) => row.reportPoints), color: hexFor('PointSource', 'DAILY_REPORT') },
      { label: t('kpi.manualPoints'), data: sorted.map((row) => row.manualPoints), color: hexFor('PointSource', 'MANUAL') },
    ],
  }
})

const columns = computed<DataTableColumn<PointTransaction>[]>(() => [
  { key: 'createdAt', label: t('common.date'), type: 'datetime' },
  { key: 'source', label: t('kpi.source'), format: (row) => enumLabel('PointSource', row.source) },
  { key: 'reason', label: t('kpi.reason') },
  { key: 'points', label: t('kpi.points'), type: 'number', align: 'right' },
])
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 v-if="title" class="text-base font-semibold text-slate-900">{{ title }}</h3>
      <UiMonthPicker v-model="period" />
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <UiStatCard :label="t('kpi.totalPoints')" :value="kpi?.breakdown.total ?? 0" icon="sparkles" :loading="loading && !kpi" />
      <UiStatCard :label="t('kpi.taskPoints')" :value="kpi?.breakdown.task ?? 0" icon="clipboard" tone="sky" :hint="t('kpi.tasksVerifiedOf', { verified: kpi?.tasks.verified ?? 0, assigned: kpi?.tasks.assigned ?? 0 })" :loading="loading && !kpi" />
      <UiStatCard :label="t('kpi.bonusPoints')" :value="kpi?.breakdown.bonusTask ?? 0" icon="bolt" tone="violet" :loading="loading && !kpi" />
      <UiStatCard :label="t('kpi.reportPoints')" :value="kpi?.breakdown.dailyReport ?? 0" icon="document" tone="emerald" :hint="t('kpi.manualAdjustments', { points: format.points(kpi?.breakdown.manual ?? 0) })" :loading="loading && !kpi" />
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="card card-body">
        <h4 class="mb-3 text-sm font-semibold text-slate-900">{{ t('dashboard.pointsBreakdown') }}</h4>
        <ChartsDoughnutChart v-if="breakdownChart.values.length" :labels="breakdownChart.labels" :values="breakdownChart.values" :colors="breakdownChart.colors" :center-label="t('kpi.points')" />
        <UiEmptyState v-else compact :title="t('kpi.noPointsYet')" icon="sparkles" />
      </div>
      <div class="card card-body lg:col-span-2">
        <h4 class="mb-3 text-sm font-semibold text-slate-900">{{ t('kpi.history12') }}</h4>
        <ChartsBarChart v-if="history.labels.length" :labels="history.labels" :datasets="history.datasets" stacked />
        <UiEmptyState v-else compact :title="t('kpi.noHistory')" />
      </div>
    </div>

    <UiDataTable :columns="columns" :rows="kpi?.transactions ?? []" :loading="loading" :paginated="false" :export-title="t('kpi.transactions')" :export-subtitle="format.period(period.year, period.month)" dense>
      <template #cell-source="{ row }">
        <UiBadge enum-name="PointSource" :value="row.source" />
      </template>
      <template #cell-points="{ row }">
        <span class="font-semibold tabular-nums" :class="row.points >= 0 ? 'text-green-700' : 'text-red-600'">{{ format.points(row.points) }}</span>
      </template>
    </UiDataTable>
  </div>
</template>
