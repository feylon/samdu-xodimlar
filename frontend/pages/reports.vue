<script setup lang="ts">
import type { DailyReport, MissingReportMember } from '~/types/api'
import { currentPeriod } from '~/utils/dates'

definePageMeta({ title: 'nav.reports' })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const auth = useAuthStore()
const format = useFormat()
const organization = useOrganizationStore()
const { departments, selectOptions } = useDepartments()

const departmentNames = computed(() => Object.fromEntries(departments.value.map((department) => [department.id, department.name])))
const managedDepartments = computed(() => departments.value.filter((department) => department.headUserId === auth.user?.id))
const managedOptions = computed(() => managedDepartments.value.map((department) => ({ value: department.id, label: `${department.name} (${department.code})` })))

const period = ref(currentPeriod())
const myReports = ref<DailyReport[]>([])
const myLoading = ref(false)

const loadMine = async () => {
  myLoading.value = true
  try {
    myReports.value = await api.get<DailyReport[]>('/reports/daily/me', { year: period.value.year, month: period.value.month })
  } catch (error) {
    ui.toastError(error)
  } finally {
    myLoading.value = false
  }
}

const missing = ref<MissingReportMember[]>([])
const missingLoading = ref(false)
const missingDepartment = ref('')

const loadMissing = async () => {
  missingLoading.value = true
  try {
    missing.value = await api.get<MissingReportMember[]>('/reports/daily/missing', { departmentId: missingDepartment.value || undefined })
  } catch (error) {
    ui.toastError(error)
  } finally {
    missingLoading.value = false
  }
}

const isSubmitter = computed(() => auth.isEmployee || auth.isHead)

onMounted(async () => {
  if (isSubmitter.value) await loadMine()
  if (auth.isHead) await loadMissing()
  if (auth.isHead && !organization.settings) await organization.loadSettings().catch(() => undefined)
})
watch(period, loadMine, { deep: true })
watch(missingDepartment, loadMissing)

const onSaved = (report: DailyReport) => {
  myReports.value = [report, ...myReports.value.filter((item) => item.id !== report.id)]
}

const tab = ref(auth.isHead ? 'team' : 'mine')
const tabs = computed(() => (auth.isHead ? [{ key: 'team', label: t('reports.teamReports') }, { key: 'mine', label: t('reports.myReports') }] : []))

const monthlyStats = computed(() => {
  const rated = myReports.value.filter((report) => report.rating)
  const average = rated.length ? rated.reduce((sum, report) => sum + (report.rating ?? 0), 0) / rated.length : 0
  return { count: myReports.value.length, rated: rated.length, average: average.toFixed(1), points: myReports.value.reduce((sum, report) => sum + report.pointsAwarded, 0) }
})
</script>

<template>
  <div>
    <UiPageHeader :title="t('nav.reports')" :subtitle="isSubmitter ? t('reports.employeeSubtitle') : t('reports.managementSubtitle')" />

    <UiTabs v-if="tabs.length" v-model="tab" :tabs="tabs" class="mb-5" />

    <template v-if="isSubmitter && (tab === 'mine' || !auth.isHead)">
      <div class="space-y-5">
        <ReportsTodayEditor @saved="onSaved" />

        <div class="card">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <h3 class="text-sm font-semibold text-slate-900">{{ t('reports.myReports') }}</h3>
            <UiMonthPicker v-model="period" />
          </div>
          <div class="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-4">
            <div class="rounded-lg bg-slate-50 p-3"><p class="text-[11px] uppercase tracking-wide text-slate-500">{{ t('reports.submittedCount') }}</p><p class="text-xl font-semibold tabular-nums">{{ monthlyStats.count }}</p></div>
            <div class="rounded-lg bg-slate-50 p-3"><p class="text-[11px] uppercase tracking-wide text-slate-500">{{ t('reports.ratedCount') }}</p><p class="text-xl font-semibold tabular-nums">{{ monthlyStats.rated }}</p></div>
            <div class="rounded-lg bg-slate-50 p-3"><p class="text-[11px] uppercase tracking-wide text-slate-500">{{ t('reports.averageRating') }}</p><p class="text-xl font-semibold tabular-nums">{{ monthlyStats.average }}</p></div>
            <div class="rounded-lg bg-slate-50 p-3"><p class="text-[11px] uppercase tracking-wide text-slate-500">{{ t('kpi.points') }}</p><p class="text-xl font-semibold tabular-nums">{{ monthlyStats.points }}</p></div>
          </div>
          <div v-if="myLoading && myReports.length === 0" class="space-y-2 p-4"><div v-for="index in 4" :key="index" class="skeleton h-14" /></div>
          <UiEmptyState v-else-if="myReports.length === 0" :title="t('reports.noReportsMonth')" icon="document" compact />
          <ul v-else class="divide-y divide-slate-100">
            <li v-for="report in myReports" :key="report.id" class="px-5 py-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-3">
                  <span class="text-sm font-semibold tabular-nums text-slate-900">{{ format.date(report.date) }}</span>
                  <ReportsRatingStars v-if="report.rating" :model-value="report.rating" read-only :size="14" />
                  <UiBadge v-else tone="amber" :label="t('reports.awaitingRating')" />
                </div>
                <div class="flex items-center gap-2 text-xs text-slate-500">
                  <span v-if="report.completedTaskIds.length">{{ t('reports.linkedTasks', { count: report.completedTaskIds.length }) }}</span>
                  <UiBadge v-if="report.pointsAwarded" tone="green" :label="`+${report.pointsAwarded} ${t('kpi.pointsShort')}`" :dot="false" />
                </div>
              </div>
              <p class="mt-1.5 line-clamp-2 text-sm text-slate-600">{{ report.content }}</p>
              <p v-if="report.ratingComment" class="mt-1 text-xs text-amber-700">{{ t('reports.headComment') }}: {{ report.ratingComment }}</p>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template v-else-if="auth.isHead">
      <div class="space-y-5">
        <div class="card">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <h3 class="text-sm font-semibold text-slate-900">{{ t('reports.missingToday') }} · {{ format.date(new Date()) }}</h3>
            <div class="flex items-center gap-2">
              <UiSelect v-model="missingDepartment" :options="managedOptions" :placeholder="t('common.allDepartments')" size="sm" class="w-56" />
              <button type="button" class="btn-icon" :disabled="missingLoading" @click="loadMissing">
                <UiSpinner v-if="missingLoading" :size="14" />
                <UiIcon v-else name="refresh" :size="16" />
              </button>
            </div>
          </div>
          <UiEmptyState v-if="!missingLoading && missing.length === 0" :title="t('dashboard.allReportsSubmitted')" icon="checkCircle" compact />
          <div v-else class="flex flex-wrap gap-2 p-4">
            <NuxtLink v-for="member in missing" :key="member.userId" :to="`/employees/${member.userId}`" class="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 py-1 pl-1 pr-3 text-xs font-medium text-red-800 hover:border-red-300">
              <UiAvatar :file-id="member.photoFileId" :name="member.fullName" size="xs" />
              {{ member.fullName }}
            </NuxtLink>
          </div>
        </div>
        <ReportsListTable :department-options="managedOptions" :department-names="departmentNames" can-rate />
      </div>
    </template>

    <ReportsListTable v-else :department-options="selectOptions" :department-names="departmentNames" />
  </div>
</template>
