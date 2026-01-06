<script setup lang="ts">
import type { HrDashboard } from '~/types/api'
import { EMPLOYEE_STATUSES } from '~/utils/enums'

const props = defineProps<{ data: HrDashboard }>()

const { t } = useI18n()
const format = useFormat()
const series = useDashboardSeries()

const openTasks = computed(() => series.sumValues(props.data.tasks.byStatus, ['ASSIGNED', 'IN_PROGRESS', 'REJECTED']))
const payrollTotal = computed(() => props.data.payroll.reduce((sum, row) => sum + row.total, 0))
const payrollCalculated = computed(() => props.data.payroll.find((row) => row.status === 'CALCULATED')?.count ?? 0)
const statusChart = computed(() => series.statusDistribution('EmployeeStatus', EMPLOYEE_STATUSES, props.data.employees.byStatus))
const attendanceChart = computed(() => series.attendanceSeries(props.data.attendanceSeries))
const trend = computed(() => series.payrollTrend(props.data.payrollTrend))
const taskChart = computed(() => series.taskDistribution(props.data.tasks.byStatus))
</script>

<template>
  <div class="space-y-5">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UiStatCard :label="t('dashboard.employeesTotal')" :value="data.employees.total" icon="users" :hint="t('dashboard.hiredTerminated', { hired: data.employees.hiredThisMonth, terminated: data.employees.terminatedThisMonth })" to="/employees" />
      <UiStatCard :label="t('dashboard.attendanceToday')" :value="format.percent(data.attendanceToday.ratio)" icon="clock" tone="green" :hint="t('dashboard.presentOfExpected', { present: data.attendanceToday.present, expected: data.attendanceToday.expected })" to="/attendance" />
      <UiStatCard :label="t('dashboard.openTasks')" :value="openTasks" icon="clipboard" tone="sky" :hint="t('dashboard.overdue', { count: data.tasks.overdue })" to="/tasks" />
      <UiStatCard :label="t('dashboard.payrollMonth')" :value="format.money(payrollTotal)" icon="banknotes" tone="violet" :hint="t('dashboard.awaitingPayment', { count: payrollCalculated })" to="/payroll" />
      <UiStatCard :label="t('dashboard.departments')" :value="data.departments" icon="building" tone="slate" to="/departments" />
      <UiStatCard :label="t('dashboard.averageKpi')" :value="format.number(data.kpi.averagePoints)" icon="chart" tone="amber" :hint="format.period(data.period.year, data.period.month)" to="/kpi" />
      <UiStatCard :label="t('dashboard.reportsToday')" :value="data.reportsToday.submitted" icon="document" tone="emerald" :hint="t('dashboard.ratedCount', { count: data.reportsToday.rated })" to="/reports" />
      <UiStatCard :label="t('dashboard.activeEmployees')" :value="data.employees.byStatus.ACTIVE ?? 0" icon="checkCircle" tone="green" :hint="t('dashboard.onLeave', { count: (data.employees.byStatus.VACATION ?? 0) + (data.employees.byStatus.SICK_LEAVE ?? 0) })" />
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="card card-body">
        <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ t('dashboard.employeeStatusDistribution') }}</h3>
        <ChartsDoughnutChart v-if="statusChart.values.length" :labels="statusChart.labels" :values="statusChart.values" :colors="statusChart.colors" :center-label="t('dashboard.total')" />
        <UiEmptyState v-else compact />
      </div>
      <div class="card card-body lg:col-span-2">
        <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ t('dashboard.attendanceSeries') }}</h3>
        <ChartsBarChart v-if="attendanceChart.labels.length" :labels="attendanceChart.labels" :datasets="attendanceChart.datasets" stacked />
        <UiEmptyState v-else compact />
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="card card-body lg:col-span-2">
        <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ t('dashboard.payrollTrend') }}</h3>
        <ChartsLineChart v-if="trend.labels.length" :labels="trend.labels" :datasets="[{ label: t('dashboard.payrollTotal'), data: trend.values, fill: true }]" :value-formatter="(value) => format.money(value)" />
        <UiEmptyState v-else compact />
      </div>
      <div class="card card-body">
        <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ t('dashboard.taskStatusDistribution') }}</h3>
        <ChartsDoughnutChart v-if="taskChart.values.length" :labels="taskChart.labels" :values="taskChart.values" :colors="taskChart.colors" :center-label="t('nav.tasks')" />
        <UiEmptyState v-else compact />
      </div>
    </div>

    <div class="card card-body">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-900">{{ t('dashboard.topPerformers') }}</h3>
        <NuxtLink to="/kpi" class="text-xs font-medium text-brand hover:underline">{{ t('kpi.leaderboard') }}</NuxtLink>
      </div>
      <KpiLeaderboardList :entries="data.topPerformers" />
    </div>
  </div>
</template>
