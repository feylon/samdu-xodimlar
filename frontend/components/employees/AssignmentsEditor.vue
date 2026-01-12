<script setup lang="ts">
import type { Department } from '~/types/api'
import { ASSIGNMENT_RATES } from '~/utils/enums'

export interface AssignmentRow {
  departmentId: string
  rate: number
}

const props = defineProps<{ modelValue: AssignmentRow[]; departments: Department[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: AssignmentRow[]] }>()

const { t } = useI18n()

const total = computed(() => props.modelValue.reduce((sum, row) => sum + Number(row.rate || 0), 0))
const duplicates = computed(() => new Set(props.modelValue.map((row) => row.departmentId)).size !== props.modelValue.length)
const hasEmpty = computed(() => props.modelValue.some((row) => !row.departmentId))
const valid = computed(() => total.value <= 100 && !duplicates.value && !hasEmpty.value)

defineExpose({ valid, total })

const departmentOptions = computed(() => props.departments.map((department) => ({ value: department.id, label: `${department.name} (${department.code})` })))
const rateOptions = ASSIGNMENT_RATES.map((rate) => ({ value: rate, label: `${rate}%` }))

const update = (index: number, patch: Partial<AssignmentRow>) => {
  const next = props.modelValue.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
  emit('update:modelValue', next)
}

const add = () => {
  if (props.modelValue.length >= 4) return
  const remaining = Math.max(0, 100 - total.value)
  const rate = ASSIGNMENT_RATES.filter((option) => option <= remaining).pop() ?? 25
  emit('update:modelValue', [...props.modelValue, { departmentId: '', rate }])
}

const remove = (index: number) => emit('update:modelValue', props.modelValue.filter((_, rowIndex) => rowIndex !== index))
</script>

<template>
  <div class="space-y-3">
    <div v-if="modelValue.length === 0" class="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">{{ t('employees.noAssignments') }}</div>
    <div v-for="(row, index) in modelValue" :key="index" class="flex items-end gap-2">
      <UiFormField :label="index === 0 ? t('departments.department') : ''" class="flex-1">
        <UiSelect :model-value="row.departmentId" :options="departmentOptions" :placeholder="t('departments.selectDepartment')" :clearable="false" @update:model-value="update(index, { departmentId: String($event ?? '') })" />
      </UiFormField>
      <UiFormField :label="index === 0 ? t('employees.rate') : ''" class="w-28">
        <UiSelect :model-value="row.rate" :options="rateOptions" :clearable="false" @update:model-value="update(index, { rate: Number($event) })" />
      </UiFormField>
      <button type="button" class="btn-icon mb-0.5 text-red-500 hover:bg-red-50 hover:text-red-700" :title="t('common.remove')" @click="remove(index)">
        <UiIcon name="trash" :size="16" />
      </button>
    </div>
    <div class="flex flex-wrap items-center justify-between gap-2">
      <button type="button" class="btn-secondary btn-sm" :disabled="modelValue.length >= 4" @click="add">
        <UiIcon name="plus" :size="14" />
        {{ t('employees.addAssignment') }}
      </button>
      <div class="flex items-center gap-3 text-xs">
        <span v-if="duplicates" class="text-red-600">{{ t('employees.duplicateDepartments') }}</span>
        <span v-if="hasEmpty" class="text-red-600">{{ t('employees.selectAllDepartments') }}</span>
        <span class="font-medium" :class="total > 100 ? 'text-red-600' : 'text-slate-700'">{{ t('employees.totalRate') }}: {{ total }}%</span>
      </div>
    </div>
    <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div class="h-full rounded-full transition-all" :class="total > 100 ? 'bg-red-500' : 'bg-brand'" :style="{ width: `${Math.min(100, total)}%` }" />
    </div>
  </div>
</template>
