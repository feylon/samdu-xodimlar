<script setup lang="ts">
import type { Paginated, PayrollRecord } from '~/types/api'
import type { DataTableColumn } from '~/components/ui/DataTable.vue'
import { PAYROLL_STATUSES } from '~/utils/enums'
import { currentPeriod, shiftPeriod } from '~/utils/dates'

definePageMeta({ title: 'nav.payroll' })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const auth = useAuthStore()
const format = useFormat()
const enumLabel = useEnumLabel()
const { selectOptions: departmentOptions } = useDepartments()
const { pending, run } = useAsyncAction()

const hasOwnPayroll = computed(() => auth.isEmployee || auth.isHead)
const seesTable = computed(() => auth.isHr || auth.isSuperadmin || auth.isHead)

const tab = ref(hasOwnPayroll.value ? 'mine' : 'all')
const tabs = computed(() => [...(hasOwnPayroll.value ? [{ key: 'mine', label: t('payroll.myPayroll') }] : []), ...(seesTable.value ? [{ key: 'all', label: auth.isHead ? t('payroll.teamPayroll') : t('payroll.allRecords') }] : [])])

const mine = ref<PayrollRecord[]>([])
const mineLoading = ref(false)
const loadMine = async () => {
  mineLoading.value = true
  try {
    mine.value = await api.get<PayrollRecord[]>('/payroll/me')
  } catch (error) {
    ui.toastError(error)
  } finally {
    mineLoading.value = false
  }
}

const filters = reactive({ year: null as number | null, month: null as number | null, departmentId: '', status: '', userId: null as string | null })
const page = ref(1)
const limit = ref(20)
const data = ref<Paginated<PayrollRecord>>({ items: [], total: 0, page: 1, limit: 20 })
const loading = ref(false)

const load = async () => {
  loading.value = true
  try {
    data.value = await api.get<Paginated<PayrollRecord>>('/payroll', {
      year: filters.year ?? undefined,
      month: filters.month ?? undefined,
      departmentId: filters.departmentId || undefined,
      status: filters.status || undefined,
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
onMounted(() => {
  if (hasOwnPayroll.value) void loadMine()
  if (seesTable.value) void load()
})

const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, index) => current - index).map((year) => ({ value: year, label: String(year) }))
})
const monthOptions = computed(() => Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: format.monthName(index + 1) })))
const statusOptions = PAYROLL_STATUSES.map((status) => ({ value: status, label: enumLabel('PayrollStatus', status) }))

const columns = computed<DataTableColumn<PayrollRecord>[]>(() => [
  { key: 'user', label: t('employees.fullName'), format: (row) => row.user?.fullName ?? '' },
  { key: 'period', label: t('payroll.period'), format: (row) => format.period(row.year, row.month) },
  { key: 'baseAmount', label: t('payroll.baseAmount'), type: 'number', align: 'right', format: (row) => format.money(row.baseAmount, row.currency) },
  { key: 'attendanceAmount', label: t('payroll.attendanceAmount'), type: 'number', align: 'right', format: (row) => format.money(row.attendanceAmount, row.currency) },
  { key: 'bonusAmount', label: t('payroll.bonusAmount'), type: 'number', align: 'right', format: (row) => format.money(row.bonusAmount, row.currency) },
  { key: 'totalAmount', label: t('payroll.totalAmount'), type: 'number', align: 'right', format: (row) => format.money(row.totalAmount, row.currency) },
  { key: 'status', label: t('common.status'), format: (row) => enumLabel('PayrollStatus', row.status) },
  { key: 'calculatedAt', label: t('payroll.calculatedAt'), type: 'datetime' },
])

const selected = ref<PayrollRecord | null>(null)

const calculateOpen = ref(false)
const calcForm = reactive({ ...shiftPeriod(currentPeriod(), -1), departmentId: '' })
const calculate = async () => {
  const result = await run(
    () => api.post<{ calculated: number; skippedPaid: number; records: PayrollRecord[] }>('/payroll/calculate', { year: calcForm.year, month: calcForm.month, departmentId: calcForm.departmentId || undefined }),
    { silent: true },
  )
  if (!result) return
  ui.success('payroll.calculated', t('payroll.calculatedSummary', { calculated: result.calculated, skipped: result.skippedPaid }))
  calculateOpen.value = false
  filters.year = calcForm.year
  filters.month = calcForm.month
  await load()
}

const payOpen = ref(false)
const payNote = ref('')
const payTarget = ref<PayrollRecord | null>(null)
const openPay = (record: PayrollRecord) => {
  payTarget.value = record
  payNote.value = ''
  payOpen.value = true
}
const markPaid = async () => {
  if (!payTarget.value) return
  const result = await run(() => api.patch<PayrollRecord>(`/payroll/${payTarget.value?.id}/status`, { status: 'PAID', note: payNote.value.trim() || undefined }), { successKey: 'payroll.markedPaid' })
  if (result) {
    payOpen.value = false
    data.value.items = data.value.items.map((item) => (item.id === result.id ? { ...result, user: item.user } : item))
    if (selected.value?.id === result.id) selected.value = { ...result, user: selected.value.user }
  }
}

const totals = computed(() => ({
  total: data.value.items.reduce((sum, row) => sum + row.totalAmount, 0),
  paid: data.value.items.filter((row) => row.status === 'PAID').length,
}))
</script>

<template>
  <div>
    <UiPageHeader :title="t('nav.payroll')" :subtitle="auth.isHr ? t('payroll.hrSubtitle') : t('payroll.subtitle')">
      <button v-if="auth.isHr" type="button" class="btn-primary" @click="calculateOpen = true">
        <UiIcon name="calculator" :size="16" />
        {{ t('payroll.calculate') }}
      </button>
    </UiPageHeader>

    <UiTabs v-if="tabs.length > 1" v-model="tab" :tabs="tabs" class="mb-5" />

    <div v-if="tab === 'mine'">
      <div v-if="mineLoading && mine.length === 0" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><div v-for="index in 3" :key="index" class="card card-body"><div class="skeleton h-5 w-32" /><div class="skeleton mt-3 h-8 w-40" /></div></div>
      <UiEmptyState v-else-if="mine.length === 0" :title="t('payroll.noRecords')" icon="banknotes" />
      <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <button v-for="record in mine" :key="record.id" type="button" class="card card-body text-left transition hover:border-brand/40 hover:shadow-md" @click="selected = record">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-slate-900">{{ format.period(record.year, record.month) }}</span>
            <UiBadge enum-name="PayrollStatus" :value="record.status" />
          </div>
          <p class="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{{ format.money(record.totalAmount, record.currency) }}</p>
          <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div><p class="text-slate-500">{{ t('payroll.attendanceAmount') }}</p><p class="font-medium tabular-nums text-slate-800">{{ format.money(record.attendanceAmount, record.currency) }}</p></div>
            <div><p class="text-slate-500">{{ t('payroll.bonusAmount') }}</p><p class="font-medium tabular-nums text-slate-800">{{ format.money(record.bonusAmount, record.currency) }}</p></div>
          </div>
          <p class="mt-3 text-[11px] text-slate-500">{{ t('payroll.attendanceRatio') }}: {{ format.percent(record.breakdown.attendanceRatio) }} · {{ t('kpi.points') }}: {{ record.breakdown.taskPoints + record.breakdown.bonusPoints + record.breakdown.reportPoints + record.breakdown.manualPoints }}</p>
        </button>
      </div>
    </div>

    <UiDataTable
      v-else
      :columns="columns"
      :rows="data.items"
      :total="data.total"
      :page="page"
      :limit="limit"
      :loading="loading"
      :export-title="t('nav.payroll')"
      :export-subtitle="filters.year && filters.month ? format.period(filters.year, filters.month) : ''"
      clickable
      @update:page="page = $event"
      @update:limit="(limit = $event), (page = 1)"
      @row-click="selected = $event"
    >
      <template #filters>
        <UiSelect v-model="filters.year" :options="yearOptions" :placeholder="t('common.year')" size="sm" class="w-28" />
        <UiSelect v-model="filters.month" :options="monthOptions" :placeholder="t('common.month')" size="sm" class="w-36" />
        <UiSelect v-if="!auth.isHead" v-model="filters.departmentId" :options="departmentOptions" :placeholder="t('common.allDepartments')" size="sm" class="w-48" />
        <UiSelect v-model="filters.status" :options="statusOptions" :placeholder="t('common.allStatuses')" size="sm" class="w-36" />
        <EmployeesSearch v-model="filters.userId" class="w-52" :placeholder="t('attendance.filterEmployee')" />
        <span class="ml-auto self-center text-xs text-slate-500">{{ t('payroll.pageTotals', { total: format.money(totals.total), paid: totals.paid }) }}</span>
      </template>
      <template #cell-user="{ row }">
        <div class="flex items-center gap-2">
          <UiAvatar :file-id="row.user?.photoFileId" :name="row.user?.fullName" size="xs" />
          <div class="min-w-0">
            <p class="truncate font-medium text-slate-900">{{ row.user?.fullName ?? '—' }}</p>
            <p class="truncate text-xs text-slate-500">{{ row.user?.position ?? '' }}</p>
          </div>
        </div>
      </template>
      <template #cell-totalAmount="{ row }"><span class="font-semibold tabular-nums text-slate-900">{{ format.money(row.totalAmount, row.currency) }}</span></template>
      <template #cell-status="{ row }"><UiBadge enum-name="PayrollStatus" :value="row.status" /></template>
      <template v-if="auth.isHr" #rowActions="{ row }">
        <button v-if="row.status === 'CALCULATED'" type="button" class="btn-secondary btn-sm" @click="openPay(row)">
          <UiIcon name="check" :size="14" />
          {{ t('payroll.markPaid') }}
        </button>
      </template>
    </UiDataTable>

    <PayrollDetailDrawer :record="selected" @close="selected = null">
      <template v-if="auth.isHr && selected?.status === 'CALCULATED'" #footer>
        <button type="button" class="btn-primary" @click="openPay(selected)">
          <UiIcon name="check" :size="16" />
          {{ t('payroll.markPaid') }}
        </button>
      </template>
    </PayrollDetailDrawer>

    <UiModal :open="calculateOpen" :title="t('payroll.calculate')" :subtitle="t('payroll.calculateHint')" @close="calculateOpen = false">
      <div class="grid grid-cols-2 gap-3">
        <UiFormField :label="t('common.year')" required>
          <UiSelect v-model="calcForm.year" :options="yearOptions" :clearable="false" />
        </UiFormField>
        <UiFormField :label="t('common.month')" required>
          <UiSelect v-model="calcForm.month" :options="monthOptions" :clearable="false" />
        </UiFormField>
        <UiFormField :label="t('departments.department')" class="col-span-2" :hint="t('payroll.departmentOptional')">
          <UiSelect v-model="calcForm.departmentId" :options="departmentOptions" :placeholder="t('common.allDepartments')" />
        </UiFormField>
      </div>
      <template #footer>
        <button type="button" class="btn-secondary" @click="calculateOpen = false">{{ t('common.cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="pending" @click="calculate">
          <UiSpinner v-if="pending" />
          <UiIcon v-else name="calculator" :size="16" />
          {{ t('payroll.calculate') }}
        </button>
      </template>
    </UiModal>

    <UiModal :open="payOpen" :title="t('payroll.markPaid')" :subtitle="payTarget ? `${payTarget.user?.fullName ?? ''} · ${format.period(payTarget.year, payTarget.month)} · ${format.money(payTarget.totalAmount, payTarget.currency)}` : ''" size="sm" @close="payOpen = false">
      <p class="mb-3 text-sm text-slate-600">{{ t('payroll.markPaidWarning') }}</p>
      <UiFormField :label="t('common.note')">
        <textarea v-model="payNote" rows="2" class="input" />
      </UiFormField>
      <template #footer>
        <button type="button" class="btn-secondary" @click="payOpen = false">{{ t('common.cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="pending" @click="markPaid">
          <UiSpinner v-if="pending" />
          {{ t('common.confirm') }}
        </button>
      </template>
    </UiModal>
  </div>
</template>
