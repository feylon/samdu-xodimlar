<script setup lang="ts">
import type { AttendanceRecord, Paginated } from '~/types/api'
import type { DataTableColumn } from '~/components/ui/DataTable.vue'
import { ATTENDANCE_STATUSES } from '~/utils/enums'
import { monthStart, todayIso } from '~/utils/dates'

const props = withDefaults(defineProps<{ departmentOptions?: Array<{ value: string; label: string }>; fixedDepartmentId?: string | null; showDepartmentFilter?: boolean }>(), {
  departmentOptions: () => [],
  fixedDepartmentId: null,
  showDepartmentFilter: true,
})

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const enumLabel = useEnumLabel()
const format = useFormat()

const now = new Date()
const filters = reactive({
  departmentId: props.fixedDepartmentId ?? '',
  status: '',
  from: monthStart(now.getFullYear(), now.getMonth() + 1),
  to: todayIso(),
  userId: null as string | null,
})
const page = ref(1)
const limit = ref(20)
const data = ref<Paginated<AttendanceRecord>>({ items: [], total: 0, page: 1, limit: 20 })
const loading = ref(false)

watch(
  () => props.fixedDepartmentId,
  (value) => {
    filters.departmentId = value ?? ''
  },
)

const load = async () => {
  loading.value = true
  try {
    data.value = await api.get<Paginated<AttendanceRecord>>('/attendance', {
      departmentId: filters.departmentId || undefined,
      status: filters.status || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
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

const statusOptions = ATTENDANCE_STATUSES.map((status) => ({ value: status, label: enumLabel('AttendanceStatus', status) }))

const columns = computed<DataTableColumn<AttendanceRecord>[]>(() => [
  { key: 'date', label: t('common.date'), type: 'date' },
  { key: 'userFullName', label: t('employees.fullName') },
  { key: 'departmentName', label: t('departments.department') },
  { key: 'status', label: t('common.status'), format: (row) => enumLabel('AttendanceStatus', row.status) },
  { key: 'checkIn', label: t('attendance.checkIn') },
  { key: 'checkOut', label: t('attendance.checkOut') },
  { key: 'note', label: t('common.note') },
])
</script>

<template>
  <UiDataTable
    :columns="columns"
    :rows="data.items"
    :total="data.total"
    :page="page"
    :limit="limit"
    :loading="loading"
    :export-title="t('attendance.history')"
    :export-subtitle="`${format.date(filters.from)} – ${format.date(filters.to)}`"
    dense
    @update:page="page = $event"
    @update:limit="(limit = $event), (page = 1)"
  >
    <template #filters>
      <UiSelect v-if="showDepartmentFilter" v-model="filters.departmentId" :options="departmentOptions" :placeholder="t('common.allDepartments')" size="sm" class="w-48" />
      <UiSelect v-model="filters.status" :options="statusOptions" :placeholder="t('common.allStatuses')" size="sm" class="w-36" />
      <input v-model="filters.from" type="date" class="input w-40 py-1.5 text-xs" />
      <input v-model="filters.to" type="date" class="input w-40 py-1.5 text-xs" />
      <EmployeesSearch v-model="filters.userId" class="w-56" :placeholder="t('attendance.filterEmployee')" />
    </template>
    <template #cell-status="{ row }">
      <UiBadge enum-name="AttendanceStatus" :value="row.status" />
    </template>
  </UiDataTable>
</template>
