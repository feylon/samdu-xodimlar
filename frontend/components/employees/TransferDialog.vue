<script setup lang="ts">
import type { Department, EmployeeDetail } from '~/types/api'
import { ASSIGNMENT_RATES } from '~/utils/enums'

const props = defineProps<{ open: boolean; employee: EmployeeDetail; departments: Department[] }>()
const emit = defineEmits<{ close: []; saved: [employee: EmployeeDetail] }>()

const { t } = useI18n()
const api = useApi()
const { pending, run } = useAsyncAction()

const form = reactive({ fromDepartmentId: '', toDepartmentId: '', rate: null as number | null, reason: '' })

watch(
  () => props.open,
  (open) => {
    if (open) Object.assign(form, { fromDepartmentId: props.employee.assignments[0]?.departmentId ?? '', toDepartmentId: '', rate: null, reason: '' })
  },
)

const fromOptions = computed(() => props.employee.assignments.map((assignment) => ({ value: assignment.departmentId, label: `${assignment.departmentName} (${assignment.rate}%)` })))
const toOptions = computed(() => props.departments.filter((department) => department.id !== form.fromDepartmentId).map((department) => ({ value: department.id, label: `${department.name} (${department.code})` })))
const rateOptions = ASSIGNMENT_RATES.map((rate) => ({ value: rate, label: `${rate}%` }))

const valid = computed(() => Boolean(form.fromDepartmentId && form.toDepartmentId && form.fromDepartmentId !== form.toDepartmentId))

const submit = async () => {
  if (!valid.value) return
  const result = await run(
    () =>
      api.post<EmployeeDetail>(`/employees/${props.employee.id}/transfer`, {
        fromDepartmentId: form.fromDepartmentId,
        toDepartmentId: form.toDepartmentId,
        rate: form.rate ?? undefined,
        reason: form.reason.trim() || undefined,
      }),
    { successKey: 'employees.transferred' },
  )
  if (result) emit('saved', result)
}
</script>

<template>
  <UiModal :open="open" :title="t('employees.transfer')" :subtitle="employee.fullName" @close="emit('close')">
    <div class="space-y-4">
      <UiFormField :label="t('employees.fromDepartment')" required>
        <UiSelect v-model="form.fromDepartmentId" :options="fromOptions" :clearable="false" :placeholder="t('common.select')" />
      </UiFormField>
      <UiFormField :label="t('employees.toDepartment')" required>
        <UiSelect v-model="form.toDepartmentId" :options="toOptions" :clearable="false" :placeholder="t('common.select')" />
      </UiFormField>
      <UiFormField :label="t('employees.rate')" :hint="t('employees.transferRateHint')">
        <UiSelect v-model="form.rate" :options="rateOptions" :placeholder="t('employees.keepCurrentRate')" />
      </UiFormField>
      <UiFormField :label="t('employees.reason')">
        <textarea v-model="form.reason" rows="2" class="input" />
      </UiFormField>
    </div>
    <template #footer>
      <button type="button" class="btn-secondary" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button type="button" class="btn-primary" :disabled="!valid || pending" @click="submit">
        <UiSpinner v-if="pending" />
        <UiIcon v-else name="transfer" :size="16" />
        {{ t('employees.transfer') }}
      </button>
    </template>
  </UiModal>
</template>
