<script setup lang="ts">
import { shiftPeriod } from '~/utils/dates'

const props = defineProps<{ modelValue: { year: number; month: number } }>()
const emit = defineEmits<{ 'update:modelValue': [value: { year: number; month: number }] }>()

const format = useFormat()

const years = computed(() => {
  const current = new Date().getFullYear()
  const result: number[] = []
  for (let year = current - 5; year <= current + 1; year += 1) result.push(year)
  if (!result.includes(props.modelValue.year)) result.push(props.modelValue.year)
  return result.sort((a, b) => a - b)
})

const monthOptions = computed(() => Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: format.monthName(index + 1) })))
const yearOptions = computed(() => years.value.map((year) => ({ value: year, label: String(year) })))

const update = (patch: Partial<{ year: number; month: number }>) => emit('update:modelValue', { ...props.modelValue, ...patch })
</script>

<template>
  <div class="inline-flex items-center gap-1">
    <button type="button" class="btn-icon" @click="emit('update:modelValue', shiftPeriod(modelValue, -1))">
      <UiIcon name="chevronLeft" :size="16" />
    </button>
    <UiSelect :model-value="modelValue.month" :options="monthOptions" :clearable="false" size="sm" class="w-32" @update:model-value="update({ month: Number($event) })" />
    <UiSelect :model-value="modelValue.year" :options="yearOptions" :clearable="false" size="sm" class="w-24" @update:model-value="update({ year: Number($event) })" />
    <button type="button" class="btn-icon" @click="emit('update:modelValue', shiftPeriod(modelValue, 1))">
      <UiIcon name="chevronRight" :size="16" />
    </button>
  </div>
</template>
