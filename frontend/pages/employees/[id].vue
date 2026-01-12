<script setup lang="ts">
import type { EmployeeDetail, Paginated, PayrollRecord } from '~/types/api'
import type { PersonalFormModel } from '~/components/employees/PersonalForm.vue'
import type { AssignmentRow } from '~/components/employees/AssignmentsEditor.vue'
import type { DataTableColumn } from '~/components/ui/DataTable.vue'

definePageMeta({ title: 'employees.profile', middleware: 'role', roles: ['HR', 'SUPERADMIN', 'DEPARTMENT_HEAD'] })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const auth = useAuthStore()
const files = useFiles()
const format = useFormat()
const enumLabel = useEnumLabel()
const route = useRoute()
const { departments } = useDepartments()
const { pending, run } = useAsyncAction()

const employeeId = computed(() => String(route.params.id))
const employee = ref<EmployeeDetail | null>(null)
const loading = ref(true)
const tab = ref('overview')

const canEdit = computed(() => auth.isHr || auth.isSuperadmin)

const load = async () => {
  loading.value = true
  try {
    employee.value = await api.get<EmployeeDetail>(`/employees/${employeeId.value}`)
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const tabs = computed(() => [
  { key: 'overview', label: t('employees.tabs.overview') },
  { key: 'assignments', label: t('employees.tabs.assignments'), count: employee.value?.assignments.length },
  { key: 'status', label: t('employees.tabs.status'), count: employee.value?.statusHistory.length },
  { key: 'attendance', label: t('nav.attendance') },
  { key: 'kpi', label: t('nav.kpi') },
  { key: 'payroll', label: t('nav.payroll') },
])

const editOpen = ref(false)
const editModel = ref<PersonalFormModel | null>(null)
const editForm = ref<{ valid: boolean } | null>(null)

const openEdit = () => {
  if (!employee.value) return
  editModel.value = {
    fullName: employee.value.fullName,
    pinfl: employee.value.pinfl ?? '',
    phone: employee.value.phone ?? '',
    email: employee.value.email ?? '',
    position: employee.value.position ?? '',
    baseSalary: employee.value.baseSalary,
    hireDate: employee.value.hireDate ?? '',
    birthDate: employee.value.birthDate ?? '',
    address: employee.value.address ?? '',
    photoFileId: employee.value.photoFileId,
    passportFileIds: [...employee.value.passportFileIds],
  }
  editOpen.value = true
}

const saveEdit = async () => {
  if (!employee.value || !editModel.value || !editForm.value?.valid) return
  const model = editModel.value
  const result = await run(
    () =>
      api.patch<EmployeeDetail>(`/employees/${employee.value?.id}`, {
        fullName: model.fullName.trim(),
        pinfl: model.pinfl || undefined,
        phone: model.phone.trim() || undefined,
        email: model.email.trim() || undefined,
        position: model.position.trim() || undefined,
        baseSalary: model.baseSalary ?? undefined,
        photoFileId: model.photoFileId ?? undefined,
        passportFileIds: model.passportFileIds,
        hireDate: model.hireDate || undefined,
        birthDate: model.birthDate || undefined,
        address: model.address.trim() || undefined,
      }),
    { successKey: 'common.saved' },
  )
  if (result) {
    employee.value = result
    editOpen.value = false
    if (result.id === auth.user?.id) auth.updateUser(result)
  }
}

const assignmentsDraft = ref<AssignmentRow[]>([])
const assignmentsEditing = ref(false)
const assignmentsEditor = ref<{ valid: boolean } | null>(null)

const startAssignments = () => {
  assignmentsDraft.value = (employee.value?.assignments ?? []).map((assignment) => ({ departmentId: assignment.departmentId, rate: assignment.rate }))
  assignmentsEditing.value = true
}

const saveAssignments = async () => {
  if (!employee.value || !assignmentsEditor.value?.valid) return
  const result = await run(() => api.put<EmployeeDetail>(`/employees/${employee.value?.id}/assignments`, { assignments: assignmentsDraft.value }), { successKey: 'employees.assignmentsSaved' })
  if (result) {
    employee.value = result
    assignmentsEditing.value = false
  }
}

const transferOpen = ref(false)
const statusOpen = ref(false)
const credentialsOpen = ref(false)

const onSaved = (updated: EmployeeDetail) => {
  employee.value = updated
  transferOpen.value = false
  statusOpen.value = false
}

const payroll = ref<Paginated<PayrollRecord>>({ items: [], total: 0, page: 1, limit: 20 })
const payrollLoading = ref(false)
const payrollPage = ref(1)
const payrollLoaded = ref(false)
const selectedPayroll = ref<PayrollRecord | null>(null)

const loadPayroll = async () => {
  payrollLoading.value = true
  try {
    payroll.value = await api.get<Paginated<PayrollRecord>>('/payroll', { userId: employeeId.value, page: payrollPage.value, limit: 12 })
    payrollLoaded.value = true
  } catch (error) {
    ui.toastError(error)
  } finally {
    payrollLoading.value = false
  }
}

watch(tab, (value) => {
  if (value === 'payroll' && !payrollLoaded.value) void loadPayroll()
})
watch(payrollPage, loadPayroll)

const payrollColumns = computed<DataTableColumn<PayrollRecord>[]>(() => [
  { key: 'period', label: t('payroll.period'), format: (row) => format.period(row.year, row.month) },
  { key: 'baseAmount', label: t('payroll.baseAmount'), type: 'number', align: 'right', format: (row) => format.money(row.baseAmount, row.currency) },
  { key: 'attendanceAmount', label: t('payroll.attendanceAmount'), type: 'number', align: 'right', format: (row) => format.money(row.attendanceAmount, row.currency) },
  { key: 'bonusAmount', label: t('payroll.bonusAmount'), type: 'number', align: 'right', format: (row) => format.money(row.bonusAmount, row.currency) },
  { key: 'totalAmount', label: t('payroll.totalAmount'), type: 'number', align: 'right', format: (row) => format.money(row.totalAmount, row.currency) },
  { key: 'status', label: t('common.status'), format: (row) => enumLabel('PayrollStatus', row.status) },
])

const overviewFields = computed(() => {
  const data = employee.value
  if (!data) return []
  return [
    { label: t('auth.loginField'), value: `@${data.login}` },
    { label: t('employees.pinfl'), value: data.pinfl ?? '—' },
    { label: t('employees.phone'), value: data.phone ?? '—' },
    { label: t('employees.email'), value: data.email ?? '—' },
    { label: t('employees.baseSalary'), value: format.money(data.baseSalary) },
    { label: t('employees.hireDate'), value: format.date(data.hireDate) },
    { label: t('employees.birthDate'), value: format.date(data.birthDate) },
    { label: t('employees.terminatedAt'), value: format.date(data.terminatedAt) },
    { label: t('employees.lastLogin'), value: format.dateTime(data.lastLoginAt) },
    { label: t('employees.address'), value: data.address ?? '—' },
  ]
})

const passportUrl = (id: string) => files.contentUrl(id, true) ?? ''
</script>

<template>
  <div>
    <UiPageHeader :title="employee?.fullName ?? t('employees.profile')" :subtitle="employee?.position ?? ''" back-to="/employees">
      <template v-if="employee && canEdit">
        <button type="button" class="btn-secondary" @click="statusOpen = true">
          <UiIcon name="refresh" :size="16" />
          {{ t('employees.changeStatus') }}
        </button>
        <button v-if="auth.isSuperadmin" type="button" class="btn-secondary" @click="credentialsOpen = true">
          <UiIcon name="key" :size="16" />
          {{ t('users.resetCredentials') }}
        </button>
        <button type="button" class="btn-primary" @click="openEdit">
          <UiIcon name="pencil" :size="16" />
          {{ t('common.edit') }}
        </button>
      </template>
    </UiPageHeader>

    <div v-if="loading && !employee" class="card card-body">
      <div class="flex items-center gap-4">
        <div class="skeleton h-20 w-20 rounded-full" />
        <div class="space-y-2">
          <div class="skeleton h-5 w-48" />
          <div class="skeleton h-4 w-32" />
        </div>
      </div>
    </div>

    <template v-else-if="employee">
      <div class="card card-body flex flex-col gap-5 sm:flex-row sm:items-center">
        <UiAvatar :file-id="employee.photoFileId" :name="employee.fullName" size="xl" />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-xl font-semibold text-slate-900">{{ employee.fullName }}</h2>
            <UiBadge enum-name="EmployeeStatus" :value="employee.status" size="sm" />
            <UiBadge enum-name="UserRole" :value="employee.role" size="sm" />
            <UiBadge v-if="employee.mustChangePassword" tone="amber" :label="t('users.mustChangePassword')" size="sm" />
          </div>
          <p class="mt-1 text-sm text-slate-500">{{ employee.position || t('employees.noPosition') }} · @{{ employee.login }}</p>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <NuxtLink v-for="assignment in employee.assignments" :key="assignment.id" :to="`/departments/${assignment.departmentId}`">
              <UiBadge :label="`${assignment.departmentName} · ${assignment.rate}%${assignment.isHead ? ` · ${t('departments.head')}` : ''}`" tone="brand" :dot="false" size="sm" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <UiTabs v-model="tab" :tabs="tabs" class="mt-5" />

      <div class="mt-5">
        <div v-if="tab === 'overview'" class="grid gap-4 lg:grid-cols-3">
          <div class="card card-body lg:col-span-2">
            <h3 class="mb-4 text-sm font-semibold text-slate-900">{{ t('employees.personalData') }}</h3>
            <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div v-for="field in overviewFields" :key="field.label">
                <dt class="text-xs text-slate-500">{{ field.label }}</dt>
                <dd class="mt-0.5 text-sm font-medium text-slate-800 break-words">{{ field.value }}</dd>
              </div>
            </dl>
          </div>
          <div class="card card-body">
            <h3 class="mb-4 text-sm font-semibold text-slate-900">{{ t('employees.passportScans') }}</h3>
            <div v-if="employee.passportFileIds.length" class="grid grid-cols-2 gap-3">
              <a v-for="fileId in employee.passportFileIds" :key="fileId" :href="passportUrl(fileId)" target="_blank" rel="noopener" class="group relative block aspect-[4/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <img :src="passportUrl(fileId)" :alt="fileId" class="h-full w-full object-cover transition group-hover:scale-105" @error="($event.target as HTMLImageElement).style.display = 'none'" />
                <span class="absolute inset-0 flex items-center justify-center bg-slate-900/0 text-white opacity-0 transition group-hover:bg-slate-900/30 group-hover:opacity-100">
                  <UiIcon name="eye" :size="20" />
                </span>
              </a>
            </div>
            <UiEmptyState v-else compact :title="t('employees.noPassportScans')" icon="identification" />
          </div>
        </div>

        <div v-else-if="tab === 'assignments'" class="card">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
            <h3 class="text-sm font-semibold text-slate-900">{{ t('employees.assignments') }}</h3>
            <div v-if="canEdit" class="flex gap-2">
              <button v-if="!assignmentsEditing" type="button" class="btn-secondary btn-sm" :disabled="employee.assignments.length === 0" @click="transferOpen = true">
                <UiIcon name="transfer" :size="14" />
                {{ t('employees.transfer') }}
              </button>
              <button v-if="!assignmentsEditing" type="button" class="btn-primary btn-sm" @click="startAssignments">
                <UiIcon name="pencil" :size="14" />
                {{ t('common.edit') }}
              </button>
            </div>
          </div>
          <div class="p-5">
            <template v-if="assignmentsEditing">
              <EmployeesAssignmentsEditor ref="assignmentsEditor" v-model="assignmentsDraft" :departments="departments" />
              <div class="mt-4 flex justify-end gap-2">
                <button type="button" class="btn-secondary" @click="assignmentsEditing = false">{{ t('common.cancel') }}</button>
                <button type="button" class="btn-primary" :disabled="pending || !assignmentsEditor?.valid" @click="saveAssignments">
                  <UiSpinner v-if="pending" />
                  {{ t('common.save') }}
                </button>
              </div>
            </template>
            <template v-else>
              <table v-if="employee.assignments.length" class="min-w-full divide-y divide-slate-100">
                <thead class="table-head">
                  <tr>
                    <th class="px-3 py-2">{{ t('departments.department') }}</th>
                    <th class="px-3 py-2">{{ t('departments.code') }}</th>
                    <th class="px-3 py-2 text-right">{{ t('employees.rate') }}</th>
                    <th class="px-3 py-2">{{ t('common.startDate') }}</th>
                    <th class="px-3 py-2">{{ t('departments.head') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <tr v-for="assignment in employee.assignments" :key="assignment.id">
                    <td class="px-3 py-2.5 font-medium text-slate-800">
                      <NuxtLink :to="`/departments/${assignment.departmentId}`" class="hover:text-brand">{{ assignment.departmentName }}</NuxtLink>
                    </td>
                    <td class="px-3 py-2.5 font-mono text-xs text-slate-500">{{ assignment.departmentCode }}</td>
                    <td class="px-3 py-2.5 text-right tabular-nums">{{ assignment.rate }}%</td>
                    <td class="px-3 py-2.5 text-slate-600">{{ format.date(assignment.startDate) }}</td>
                    <td class="px-3 py-2.5"><UiBadge v-if="assignment.isHead" tone="amber" :label="t('departments.head')" /><span v-else class="text-slate-400">—</span></td>
                  </tr>
                </tbody>
              </table>
              <UiEmptyState v-else compact :title="t('employees.noAssignments')" icon="building" />
            </template>
          </div>
        </div>

        <div v-else-if="tab === 'status'" class="card card-body">
          <h3 class="mb-4 text-sm font-semibold text-slate-900">{{ t('employees.statusHistory') }}</h3>
          <ol v-if="employee.statusHistory.length" class="relative space-y-5 border-l border-slate-200 pl-6">
            <li v-for="entry in employee.statusHistory" :key="entry.id" class="relative">
              <span class="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-brand ring-1 ring-brand/30" />
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <UiBadge enum-name="EmployeeStatus" :value="entry.fromStatus" />
                <UiIcon name="chevronRight" :size="14" class="text-slate-400" />
                <UiBadge enum-name="EmployeeStatus" :value="entry.toStatus" />
                <span class="text-xs text-slate-500">{{ format.dateTime(entry.createdAt) }}</span>
              </div>
              <p v-if="entry.reason" class="mt-1 text-sm text-slate-700">{{ entry.reason }}</p>
              <p v-if="entry.medicalReason" class="mt-0.5 text-xs text-orange-700">{{ t('employees.medicalReason') }}: {{ entry.medicalReason }}</p>
              <p v-if="entry.startDate || entry.endDate" class="mt-0.5 text-xs text-slate-500">{{ format.date(entry.startDate) }} – {{ entry.endDate ? format.date(entry.endDate) : t('common.openEnded') }}</p>
            </li>
          </ol>
          <UiEmptyState v-else compact :title="t('employees.noStatusHistory')" />
        </div>

        <AttendanceMonthlySummary v-else-if="tab === 'attendance'" :user-id="employee.id" />

        <KpiUserPanel v-else-if="tab === 'kpi'" :user-id="employee.id" />

        <div v-else-if="tab === 'payroll'">
          <UiDataTable
            :columns="payrollColumns"
            :rows="payroll.items"
            :total="payroll.total"
            :page="payrollPage"
            :limit="12"
            :loading="payrollLoading"
            :export-title="`${t('nav.payroll')} — ${employee.fullName}`"
            clickable
            @update:page="payrollPage = $event"
            @row-click="selectedPayroll = $event"
          >
            <template #cell-status="{ row }">
              <UiBadge enum-name="PayrollStatus" :value="row.status" />
            </template>
          </UiDataTable>
          <PayrollDetailDrawer :record="selectedPayroll" @close="selectedPayroll = null" />
        </div>
      </div>

      <UiModal :open="editOpen" :title="t('employees.editPersonalData')" size="xl" @close="editOpen = false">
        <EmployeesPersonalForm v-if="editModel" ref="editForm" v-model="editModel" />
        <template #footer>
          <button type="button" class="btn-secondary" @click="editOpen = false">{{ t('common.cancel') }}</button>
          <button type="button" class="btn-primary" :disabled="pending || !editForm?.valid" @click="saveEdit">
            <UiSpinner v-if="pending" />
            {{ t('common.save') }}
          </button>
        </template>
      </UiModal>

      <EmployeesStatusDialog :open="statusOpen" :employee="employee" @close="statusOpen = false" @saved="onSaved" />
      <EmployeesTransferDialog :open="transferOpen" :employee="employee" :departments="departments" @close="transferOpen = false" @saved="onSaved" />
      <EmployeesCredentialsDialog v-if="auth.isSuperadmin" :open="credentialsOpen" :user="employee" @close="credentialsOpen = false" @saved="(credentialsOpen = false), load()" />
    </template>

    <UiEmptyState v-else :title="t('errors.USER_NOT_FOUND')" />
  </div>
</template>
