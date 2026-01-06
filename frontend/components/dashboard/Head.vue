<script setup lang="ts">
import type { HeadDashboard } from '~/types/api'

const props = defineProps<{ data: HeadDashboard }>()

const { t } = useI18n()
const format = useFormat()
const series = useDashboardSeries()

const openTasks = computed(() => series.sumValues(props.data.tasks.byStatus, ['ASSIGNED', 'IN_PROGRESS', 'REJECTED']))
const attendanceChart = computed(() => series.attendanceSeries(props.data.attendanceSeries))
const taskChart = computed(() => series.taskDistribution(props.data.tasks.byStatus))
const leaderboard = computed(() => props.data.leaderboard.slice(0, 8))
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap gap-2">
      <NuxtLink v-for="department in data.departments" :key="department.id" :to="`/departments/${department.id}`" class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-brand/40">
        <UiIcon name="building" :size="14" class="text-brand" />
        {{ department.name }}
        <span class="text-slate-400">{{ department.code }}</span>
      </NuxtLink>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <UiStatCard :label="t('dashboard.teamMembers')" :value="data.team.members" icon="users" to="/employees" />
      <UiStatCard :label="t('dashboard.attendanceToday')" :value="format.percent(data.attendanceToday.ratio)" icon="clock" tone="green" :hint="t('dashboard.presentOfExpected', { present: data.attendanceToday.present, expected: data.attendanceToday.expected })" to="/attendance" />
      <UiStatCard :label="t('dashboard.openTasks')" :value="openTasks" icon="clipboard" tone="sky" :hint="t('dashboard.overdue', { count: data.tasks.overdue })" to="/tasks" />
      <UiStatCard :label="t('dashboard.pendingReview')" :value="data.tasks.pendingReview" icon="checkCircle" :tone="data.tasks.pendingReview > 0 ? 'amber' : 'slate'" to="/tasks" />
      <UiStatCard :label="t('dashboard.reportsToday')" :value="data.reports.submitted" icon="document" tone="emerald" :hint="t('dashboard.ratedCount', { count: data.reports.rated })" to="/reports" />
      <UiStatCard :label="t('dashboard.missingReports')" :value="data.reports.missing" icon="warning" :tone="data.reports.missing > 0 ? 'red' : 'slate'" to="/reports" />
      <UiStatCard :label="t('dashboard.activePolls')" :value="data.activePolls" icon="pie" tone="violet" to="/polls" />
      <UiStatCard :label="t('dashboard.period')" :value="format.period(data.period.year, data.period.month)" icon="calendar" tone="slate" to="/calendar" />
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <div class="card card-body lg:col-span-2">
        <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ t('dashboard.attendanceSeries') }}</h3>
        <ChartsBarChart v-if="attendanceChart.labels.length" :labels="attendanceChart.labels" :datasets="attendanceChart.datasets" stacked />
        <UiEmptyState v-else compact />
      </div>
      <div class="card card-body">
        <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ t('dashboard.taskStatusDistribution') }}</h3>
        <ChartsDoughnutChart v-if="taskChart.values.length" :labels="taskChart.labels" :values="taskChart.values" :colors="taskChart.colors" :center-label="t('nav.tasks')" />
        <UiEmptyState v-else compact />
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="card">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 class="text-sm font-semibold text-slate-900">{{ t('dashboard.pendingReviewItems') }}</h3>
          <NuxtLink to="/tasks?status=COMPLETED" class="text-xs font-medium text-brand hover:underline">{{ t('common.viewAll') }}</NuxtLink>
        </div>
        <ul v-if="data.tasks.pendingReviewItems.length" class="divide-y divide-slate-100">
          <li v-for="task in data.tasks.pendingReviewItems" :key="task.id" class="flex items-center gap-3 px-5 py-3">
            <UiAvatar :file-id="task.assignee?.photoFileId" :name="task.assignee?.fullName" size="sm" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-slate-800">{{ task.title }}</p>
              <p class="truncate text-xs text-slate-500">{{ task.assignee?.fullName }} · {{ format.dateTime(task.submittedAt) }}</p>
            </div>
            <UiBadge enum-name="TaskStatus" :value="task.status" />
          </li>
        </ul>
        <UiEmptyState v-else compact :title="t('dashboard.nothingToReview')" icon="checkCircle" />
      </div>

      <div class="card">
        <div class="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 class="text-sm font-semibold text-slate-900">{{ t('dashboard.missingReportsToday') }}</h3>
          <NuxtLink to="/reports" class="text-xs font-medium text-brand hover:underline">{{ t('common.viewAll') }}</NuxtLink>
        </div>
        <ul v-if="data.reports.missingItems.length" class="divide-y divide-slate-100">
          <li v-for="member in data.reports.missingItems" :key="member.userId" class="flex items-center gap-3 px-5 py-3">
            <UiAvatar :file-id="member.photoFileId" :name="member.fullName" size="sm" />
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-slate-800">{{ member.fullName }}</p>
              <p class="truncate text-xs text-slate-500">{{ member.position || '—' }}</p>
            </div>
            <UiBadge tone="red" :label="t('reports.notSubmitted')" />
          </li>
        </ul>
        <UiEmptyState v-else compact :title="t('dashboard.allReportsSubmitted')" icon="checkCircle" />
      </div>
    </div>

    <div class="card card-body">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-900">{{ t('dashboard.teamLeaderboard') }}</h3>
        <NuxtLink to="/kpi" class="text-xs font-medium text-brand hover:underline">{{ t('kpi.leaderboard') }}</NuxtLink>
      </div>
      <KpiLeaderboardList :entries="leaderboard" />
    </div>
  </div>
</template>
