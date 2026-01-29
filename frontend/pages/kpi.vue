<script setup lang="ts">
import type { DepartmentKpiSummary, LeaderboardEntry } from '~/types/api'
import type { DataTableColumn } from '~/components/ui/DataTable.vue'
import { currentPeriod } from '~/utils/dates'

definePageMeta({ title: 'nav.kpi' })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const auth = useAuthStore()
const format = useFormat()
const enumLabel = useEnumLabel()
const router = useRouter()
const { selectOptions: departmentOptions } = useDepartments()

const hasOwnKpi = computed(() => auth.isEmployee || auth.isHead)
const canAdjust = computed(() => auth.isHead || auth.isHr)
const canOpenProfiles = computed(() => auth.hasRole(['HR', 'SUPERADMIN', 'DEPARTMENT_HEAD']))

const tab = ref(hasOwnKpi.value ? 'mine' : 'leaderboard')
const tabs = computed(() => [...(hasOwnKpi.value ? [{ key: 'mine', label: t('kpi.myKpi') }] : []), { key: 'leaderboard', label: t('kpi.leaderboard') }])

const period = ref(currentPeriod())
const departmentId = ref('')
const leaderboard = ref<LeaderboardEntry[]>([])
const summary = ref<DepartmentKpiSummary | null>(null)
const loading = ref(false)

const loadLeaderboard = async () => {
  loading.value = true
  try {
    const query = { year: period.value.year, month: period.value.month }
    if (departmentId.value) {
      summary.value = await api.get<DepartmentKpiSummary>(`/kpi/departments/${departmentId.value}`, query)
      leaderboard.value = summary.value.members
    } else {
      summary.value = null
      leaderboard.value = await api.get<LeaderboardEntry[]>('/kpi/leaderboard', query)
    }
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}

watch([period, departmentId], loadLeaderboard, { immediate: true, deep: true })

const columns = computed<DataTableColumn<LeaderboardEntry & { rank: number }>[]>(() => [
  { key: 'rank', label: '#', type: 'number', width: '48px' },
  { key: 'fullName', label: t('employees.fullName') },
  { key: 'position', label: t('employees.position') },
  { key: 'status', label: t('common.status'), format: (row) => enumLabel('EmployeeStatus', row.status) },
  { key: 'taskPoints', label: t('kpi.taskPoints'), type: 'number', align: 'right', format: (row) => row.points.task },
  { key: 'bonusPoints', label: t('kpi.bonusPoints'), type: 'number', align: 'right', format: (row) => row.points.bonusTask },
  { key: 'reportPoints', label: t('kpi.reportPoints'), type: 'number', align: 'right', format: (row) => row.points.dailyReport },
  { key: 'manualPoints', label: t('kpi.manualPoints'), type: 'number', align: 'right', format: (row) => row.points.manual },
  { key: 'totalPoints', label: t('kpi.totalPoints'), type: 'number', align: 'right', format: (row) => row.points.total },
  { key: 'tasks', label: t('kpi.tasks'), format: (row) => `${row.tasks.verified} / ${row.tasks.assigned}` },
])

const rows = computed(() => leaderboard.value.map((entry, index) => ({ ...entry, rank: index + 1 })))

const adjustOpen = ref(false)
const adjustTarget = ref<LeaderboardEntry | null>(null)

const openAdjust = (entry: LeaderboardEntry | null) => {
  adjustTarget.value = entry
  adjustOpen.value = true
}

const onAdjusted = async () => {
  adjustOpen.value = false
  await loadLeaderboard()
}
</script>

<template>
  <div>
    <UiPageHeader :title="t('nav.kpi')" :subtitle="t('kpi.subtitle')">
      <button v-if="canAdjust && tab === 'leaderboard'" type="button" class="btn-primary" @click="openAdjust(null)">
        <UiIcon name="sparkles" :size="16" />
        {{ t('kpi.adjustPoints') }}
      </button>
    </UiPageHeader>

    <UiTabs v-if="tabs.length > 1" v-model="tab" :tabs="tabs" class="mb-5" />

    <KpiUserPanel v-if="tab === 'mine'" />

    <div v-else class="space-y-5">
      <div class="flex flex-wrap items-center gap-3">
        <UiMonthPicker v-model="period" />
        <UiSelect v-model="departmentId" :options="departmentOptions" :placeholder="t('kpi.wholeScope')" size="sm" class="w-64" />
      </div>

      <div v-if="summary" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <UiStatCard :label="t('departments.members')" :value="summary.memberCount" icon="users" tone="slate" />
        <UiStatCard :label="t('kpi.totalPoints')" :value="summary.totalPoints" icon="sparkles" />
        <UiStatCard :label="t('kpi.averagePoints')" :value="format.number(summary.averagePoints)" icon="chart" tone="amber" />
        <UiStatCard :label="t('kpi.tasksVerified')" :value="`${summary.tasksVerified} / ${summary.tasksAssigned}`" icon="clipboard" tone="sky" />
        <UiStatCard :label="t('kpi.completionRatio')" :value="format.percent(summary.completionRatio)" icon="checkCircle" tone="green" />
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <div class="card card-body">
          <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ t('kpi.topPerformers') }}</h3>
          <KpiLeaderboardList :entries="leaderboard.slice(0, 10)" />
        </div>
        <div class="lg:col-span-2">
          <UiDataTable
            :columns="columns"
            :rows="rows"
            :loading="loading"
            :paginated="false"
            :export-title="t('kpi.leaderboard')"
            :export-subtitle="format.period(period.year, period.month)"
            row-key="userId"
            :clickable="canOpenProfiles"
            dense
            @row-click="canOpenProfiles && router.push(`/employees/${$event.userId}`)"
          >
            <template #cell-rank="{ row }">
              <span class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" :class="row.rank <= 3 ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'">{{ row.rank }}</span>
            </template>
            <template #cell-fullName="{ row }">
              <div class="flex items-center gap-2">
                <UiAvatar :file-id="row.photoFileId" :name="row.fullName" size="xs" />
                <span class="font-medium text-slate-900">{{ row.fullName }}</span>
              </div>
            </template>
            <template #cell-status="{ row }"><UiBadge enum-name="EmployeeStatus" :value="row.status" /></template>
            <template #cell-totalPoints="{ row }"><span class="font-semibold tabular-nums text-slate-900">{{ row.points.total }}</span></template>
            <template v-if="canAdjust" #rowActions="{ row }">
              <button type="button" class="btn-icon" :title="t('kpi.adjustPoints')" @click="openAdjust(row)">
                <UiIcon name="sparkles" :size="16" />
              </button>
            </template>
          </UiDataTable>
        </div>
      </div>
    </div>

    <KpiAdjustDialog :open="adjustOpen" :user-id="adjustTarget?.userId ?? null" :user-label="adjustTarget?.fullName" @close="adjustOpen = false" @saved="onAdjusted" />
  </div>
</template>
