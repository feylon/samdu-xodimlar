<script setup lang="ts">
import type { EmployeeDashboard } from '~/types/api'
import { TASK_STATUSES, hexFor } from '~/utils/enums'

const props = defineProps<{ data: EmployeeDashboard }>()

const { t } = useI18n()
const format = useFormat()
const series = useDashboardSeries()
const enumLabel = useEnumLabel()

const openTasks = computed(() => series.sumValues(props.data.tasks.byStatus, ['ASSIGNED', 'IN_PROGRESS', 'REJECTED']))
const awaitingReview = computed(() => series.sumValues(props.data.tasks.byStatus, ['COMPLETED', 'PARTIALLY_COMPLETED']))

const pointsChart = computed(() => {
  const entries: Array<{ key: string; source: string; value: number }> = [
    { key: 'task', source: 'TASK', value: props.data.points.task },
    { key: 'bonusTask', source: 'BONUS_TASK', value: props.data.points.bonusTask },
    { key: 'dailyReport', source: 'DAILY_REPORT', value: props.data.points.dailyReport },
    { key: 'manual', source: 'MANUAL', value: props.data.points.manual },
  ].filter((entry) => entry.value !== 0)
  return {
    labels: entries.map((entry) => enumLabel('PointSource', entry.source)),
    values: entries.map((entry) => Math.abs(entry.value)),
    colors: entries.map((entry) => hexFor('PointSource', entry.source)),
  }
})

const history = computed(() => {
  const sorted = [...props.data.pointsHistory].sort((a, b) => a.year - b.year || a.month - b.month)
  return { labels: sorted.map((row) => `${format.monthName(row.month).slice(0, 3)} ${String(row.year).slice(2)}`), values: sorted.map((row) => row.totalPoints) }
})

const attendanceChart = computed(() => series.attendanceDistribution(props.data.attendance.counts))
</script>

<template>
  <div class="space-y-5">
    <div
      class="card flex flex-col gap-4 overflow-hidden p-5 sm:flex-row sm:items-center sm:justify-between"
      :class="data.reportToday.submitted ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/50'"
    >
      <div class="flex items-start gap-3">
        <span class="rounded-xl p-2.5" :class="data.reportToday.submitted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
          <UiIcon :name="data.reportToday.submitted ? 'checkCircle' : 'document'" :size="22" />
        </span>
        <div>
          <p class="text-sm font-semibold text-slate-900">{{ data.reportToday.submitted ? t('dashboard.reportSubmitted') : t('dashboard.reportMissing') }}</p>
          <p class="mt-0.5 text-xs text-slate-600">
            <template v-if="data.reportToday.submitted">
              {{ data.reportToday.rating ? t('dashboard.reportRated', { rating: data.reportToday.rating, points: data.reportToday.pointsAwarded ?? 0 }) : t('dashboard.reportAwaitingRating') }}
            </template>
            <template v-else>{{ t('dashboard.reportMissingHint') }}</template>
          </p>
        </div>
      </div>
      <NuxtLink to="/reports" :class="data.reportToday.submitted ? 'btn-secondary' : 'btn-primary'">
        {{ data.reportToday.submitted ? t('dashboard.viewReport') : t('dashboard.submitReport') }}
      </NuxtLink>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UiStatCard :label="t('dashboard.myPoints')" :value="data.points.total" icon="sparkles" :hint="format.period(data.period.year, data.period.month)" to="/kpi" />
      <UiStatCard :label="t('dashboard.openTasks')" :value="openTasks" icon="clipboard" tone="sky" :hint="t('dashboard.overdueAndReview', { overdue: data.tasks.overdue, review: awaitingReview })" to="/tasks" />
      <UiStatCard :label="t('dashboard.unreadNotifications')" :value="data.unreadNotifications" icon="bell" :tone="data.unreadNotifications > 0 ? 'amber' : 'slate'" to="/notifications" />
      <UiStatCard :label="t('dashboard.activePolls')" :value="data.activePolls" icon="pie" tone="violet" to="/polls" />
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="card card-body flex flex-col items-center">
        <h3 class="mb-3 self-start text-sm font-semibold text-slate-900">{{ t('dashboard.attendanceRatio') }}</h3>
        <ChartsRatioRing :ratio="data.attendance.ratio" :size="150" :label="t('attendance.present')" />
        <p class="mt-3 text-xs text-slate-500">{{ t('dashboard.presentDaysOf', { present: data.attendance.presentDays, elapsed: data.attendance.elapsedWorkingDays, total: data.attendance.workingDays }) }}</p>
        <div v-if="attendanceChart.values.length" class="mt-3 flex flex-wrap justify-center gap-2">
          <UiBadge v-for="(label, index) in attendanceChart.labels" :key="label" :label="`${label}: ${attendanceChart.values[index]}`" tone="slate" :dot="false" />
        </div>
      </div>
      <div class="card card-body">
        <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ t('dashboard.pointsBreakdown') }}</h3>
        <ChartsDoughnutChart v-if="pointsChart.values.length" :labels="pointsChart.labels" :values="pointsChart.values" :colors="pointsChart.colors" :center-label="t('kpi.points')" />
        <UiEmptyState v-else compact :title="t('kpi.noPointsYet')" icon="sparkles" />
      </div>
      <div class="card card-body">
        <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ t('dashboard.pointsHistory') }}</h3>
        <ChartsBarChart v-if="history.labels.length" :labels="history.labels" :datasets="[{ label: t('kpi.points'), data: history.values }]" :show-legend="false" />
        <UiEmptyState v-else compact :title="t('kpi.noHistory')" />
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="card card-body">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-900">{{ t('dashboard.latestPayroll') }}</h3>
          <NuxtLink to="/payroll" class="text-xs font-medium text-brand hover:underline">{{ t('common.viewAll') }}</NuxtLink>
        </div>
        <div v-if="data.latestPayroll" class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-slate-600">{{ format.period(data.latestPayroll.year, data.latestPayroll.month) }}</span>
            <UiBadge enum-name="PayrollStatus" :value="data.latestPayroll.status" />
          </div>
          <p class="text-3xl font-semibold tabular-nums text-slate-900">{{ format.money(data.latestPayroll.totalAmount, data.latestPayroll.currency) }}</p>
          <dl class="grid grid-cols-2 gap-2 text-xs">
            <div class="rounded-lg bg-slate-50 p-2.5">
              <dt class="text-slate-500">{{ t('payroll.attendanceAmount') }}</dt>
              <dd class="mt-0.5 font-medium tabular-nums text-slate-800">{{ format.money(data.latestPayroll.attendanceAmount, data.latestPayroll.currency) }}</dd>
            </div>
            <div class="rounded-lg bg-slate-50 p-2.5">
              <dt class="text-slate-500">{{ t('payroll.bonusAmount') }}</dt>
              <dd class="mt-0.5 font-medium tabular-nums text-slate-800">{{ format.money(data.latestPayroll.bonusAmount, data.latestPayroll.currency) }}</dd>
            </div>
          </dl>
        </div>
        <UiEmptyState v-else compact :title="t('payroll.noRecords')" icon="banknotes" />
      </div>
      <div class="card card-body">
        <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ t('dashboard.taskStatusDistribution') }}</h3>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div v-for="status in TASK_STATUSES" :key="status" class="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <UiBadge enum-name="TaskStatus" :value="status" />
            <p class="mt-2 text-xl font-semibold tabular-nums text-slate-900">{{ data.tasks.byStatus[status] ?? 0 }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
