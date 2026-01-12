<script setup lang="ts">
import type { EmployeeDetail, EmployeeStatus } from '~/types/api'
import { EMPLOYEE_STATUSES } from '~/utils/enums'
import { todayIso } from '~/utils/dates'

const props = defineProps<{ open: boolean; employee: EmployeeDetail }>()
const emit = defineEmits<{ close: []; saved: [employee: EmployeeDetail] }>()

const { t } = useI18n()
const api = useApi()
const enumLabel = useEnumLabel()
const { pending, run } = useAsyncAction()

const form = reactive({ status: '' as EmployeeStatus | '', reason: '', medicalReason: '', startDate: todayIso(), endDate: '' })

watch(
  () => props.open,
  (open) => {
    if (open) Object.assign(form, { status: '', reason: '', medicalReason: '', startDate: todayIso(), endDate: '' })
  },
)

const statusOptions = computed(() =>
  EMPLOYEE_STATUSES.filter((status) => status !== props.employee.status)
    .filter((status) => props.employee.status !== 'TERMINATED' || status === 'ACTIVE')
    .map((status) => ({ value: status, label: enumLabel('EmployeeStatus', status) })),
)

const needsMedical = computed(() => form.status === 'SICK_LEAVE')
const valid = computed(() => Boolean(form.status) && (!needsMedical.value || form.medicalReason.trim().length > 0))

const submit = async () => {
  if (!valid.value) return
  const result = await run(
    () =>
      api.patch<EmployeeDetail>(`/employees/${props.employee.id}/status`, {
        status: form.status,
        reason: form.reason.trim() || undefined,
        medicalReason: form.medicalReason.trim() || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      }),
    { successKey: 'employees.statusChanged' },
  )
  if (result) emit('saved', result)
}
</script>

<template>
  <UiModal :open="open" :title="t('employees.changeStatus')" :subtitle="employee.fullName" @close="emit('close')">
    <div class="space-y-4">
      <div class="flex items-center gap-2 text-sm text-slate-600">
        <span>{{ t('employees.currentStatus') }}:</span>
        <UiBadge enum-name="EmployeeStatus" :value="employee.status" />
      </div>
      <UiFormField :label="t('employees.newStatus')" required>
        <UiSelect v-model="form.status" :options="statusOptions" :placeholder="t('common.select')" :clearable="false" />
      </UiFormField>
      <UiFormField :label="t('employees.reason')">
        <textarea v-model="form.reason" rows="2" class="input" />
      </UiFormField>
      <UiFormField v-if="needsMedical" :label="t('employees.medicalReason')" required :hint="t('employees.medicalReasonHint')">
        <textarea v-model="form.medicalReason" rows="2" class="input" />
      </UiFormField>
      <div class="grid grid-cols-2 gap-3">
        <UiFormField :label="t('common.startDate')">
          <input v-model="form.startDate" type="date" class="input" />
        </UiFormField>
        <UiFormField :label="t('common.endDate')">
          <input v-model="form.endDate" type="date" class="input" />
        </UiFormField>
      </div>
      <p v-if="form.status === 'TERMINATED' || form.status === 'BLOCKED'" class="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{{ t('employees.terminationWarning') }}</p>
    </div>
    <template #footer>
      <button type="button" class="btn-secondary" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button type="button" class="btn-primary" :disabled="!valid || pending" @click="submit">
        <UiSpinner v-if="pending" />
        {{ t('common.save') }}
      </button>
    </template>
  </UiModal>
</template>
