<script setup lang="ts">
import type { DailyReport, Paginated } from '~/types/api'
import type { DataTableColumn } from '~/components/ui/DataTable.vue'
import { monthStart, todayIso } from '~/utils/dates'

const props = withDefaults(defineProps<{ departmentOptions?: Array<{ value: string; label: string }>; canRate?: boolean; departmentNames?: Record<string, string> }>(), {
  departmentOptions: () => [],
  canRate: false,
  departmentNames: () => ({}),
})

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const format = useFormat()

const now = new Date()
const filters = reactive({ departmentId: '', from: monthStart(now.getFullYear(), now.getMonth() + 1), to: todayIso(), unratedOnly: false, userId: null as string | null })
const page = ref(1)
const limit = ref(20)
const data = ref<Paginated<DailyReport>>({ items: [], total: 0, page: 1, limit: 20 })
const loading = ref(false)

const load = async () => {
  loading.value = true
  try {
    data.value = await api.get<Paginated<DailyReport>>('/reports/daily', {
      departmentId: filters.departmentId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      unratedOnly: filters.unratedOnly ? 'true' : undefined,
      userId: filters.userId ?? undefined,
      page: page.value,
      limit: limit.value,
    })
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}

watch(
  filters,
  () => {
    page.value = 1
    void load()
  },
  { deep: true },
)
watch([page, limit], load)
onMounted(load)

defineExpose({ reload: load })

const columns = computed<DataTableColumn<DailyReport>[]>(() => [
  { key: 'date', label: t('common.date'), type: 'date' },
  { key: 'userFullName', label: t('employees.fullName') },
  { key: 'departmentId', label: t('departments.department'), format: (row) => props.departmentNames[row.departmentId] ?? '' },
  { key: 'content', label: t('reports.content'), format: (row) => (row.content.length > 120 ? `${row.content.slice(0, 120)}…` : row.content) },
  { key: 'completedTaskIds', label: t('reports.tasks'), type: 'number', align: 'right', format: (row) => row.completedTaskIds.length },
  { key: 'rating', label: t('reports.rating'), type: 'number', align: 'center', format: (row) => (row.rating ? `${row.rating}/5` : '') },
  { key: 'pointsAwarded', label: t('kpi.points'), type: 'number', align: 'right' },
  { key: 'submittedAt', label: t('reports.submittedAtLabel'), type: 'datetime' },
])

const selected = ref<DailyReport | null>(null)
const rateOpen = ref(false)
const rating = ref<DailyReport | null>(null)

const openRate = (report: DailyReport) => {
  rating.value = report
  rateOpen.value = true
}

const onRated = (report: DailyReport) => {
  rateOpen.value = false
  data.value.items = data.value.items.map((item) => (item.id === report.id ? report : item))
  if (selected.value?.id === report.id) selected.value = report
}
</script>

<template>
  <div>
    <UiDataTable
      :columns="columns"
      :rows="data.items"
      :total="data.total"
      :page="page"
      :limit="limit"
      :loading="loading"
      :export-title="t('nav.reports')"
      :export-subtitle="`${format.date(filters.from)} – ${format.date(filters.to)}`"
      clickable
      dense
      @update:page="page = $event"
      @update:limit="(limit = $event), (page = 1)"
      @row-click="selected = $event"
    >
      <template #filters>
        <UiSelect v-if="departmentOptions.length" v-model="filters.departmentId" :options="departmentOptions" :placeholder="t('common.allDepartments')" size="sm" class="w-48" />
        <input v-model="filters.from" type="date" class="input w-40 py-1.5 text-xs" />
        <input v-model="filters.to" type="date" class="input w-40 py-1.5 text-xs" />
        <EmployeesSearch v-model="filters.userId" class="w-52" :placeholder="t('attendance.filterEmployee')" />
        <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
          <input v-model="filters.unratedOnly" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
          {{ t('reports.unratedOnly') }}
        </label>
      </template>
      <template #cell-rating="{ row }">
        <ReportsRatingStars v-if="row.rating" :model-value="row.rating" read-only :size="14" />
        <UiBadge v-else tone="amber" :label="t('reports.unrated')" />
      </template>
      <template v-if="canRate" #rowActions="{ row }">
        <button v-if="!row.ratedAt" type="button" class="btn-secondary btn-sm" @click="openRate(row)">
          <UiIcon name="star" :size="14" />
          {{ t('reports.rate') }}
        </button>
      </template>
    </UiDataTable>

    <UiDrawer :open="selected !== null" :title="selected ? `${selected.userFullName}` : ''" :subtitle="selected ? format.date(selected.date) : ''" width="lg" @close="selected = null">
      <div v-if="selected" class="space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <ReportsRatingStars v-if="selected.rating" :model-value="selected.rating" read-only />
          <UiBadge v-else tone="amber" :label="t('reports.unrated')" />
          <UiBadge v-if="selected.pointsAwarded" tone="green" :label="`+${selected.pointsAwarded} ${t('kpi.pointsShort')}`" :dot="false" />
          <span class="text-xs text-slate-500">{{ t('reports.submittedAt', { time: format.dateTime(selected.submittedAt) }) }}</span>
        </div>
        <div class="whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{{ selected.content }}</div>
        <p v-if="selected.completedTaskIds.length" class="text-xs text-slate-500">{{ t('reports.linkedTasks', { count: selected.completedTaskIds.length }) }}</p>
        <div v-if="selected.ratingComment" class="rounded-lg border border-amber-100 bg-amber-50/60 p-3">
          <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">{{ t('reports.headComment') }}</p>
          <p class="text-sm text-slate-700">{{ selected.ratingComment }}</p>
        </div>
      </div>
      <template v-if="canRate && selected && !selected.ratedAt" #footer>
        <button type="button" class="btn-primary" @click="openRate(selected)">
          <UiIcon name="star" :size="16" />
          {{ t('reports.rate') }}
        </button>
      </template>
    </UiDrawer>

    <ReportsRateDialog :open="rateOpen" :report="rating" @close="rateOpen = false" @saved="onRated" />
  </div>
</template>
