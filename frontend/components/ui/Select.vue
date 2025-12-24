<script setup lang="ts">
export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
    size?: 'sm' | 'md'
    clearable?: boolean
  }>(),
  { placeholder: '', disabled: false, size: 'md', clearable: true },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | number | null] }>()

const onChange = (event: Event) => {
  const raw = (event.target as HTMLSelectElement).value
  if (raw === '') {
    emit('update:modelValue', null)
    return
  }
  const match = props.options.find((option) => String(option.value) === raw)
  emit('update:modelValue', match ? match.value : raw)
}
</script>

<template>
  <div class="relative">
    <select
      class="input appearance-none pr-9"
      :class="size === 'sm' ? 'py-1.5 text-xs' : ''"
      :value="modelValue === null || modelValue === undefined ? '' : String(modelValue)"
      :disabled="disabled"
      @change="onChange"
    >
      <option v-if="placeholder || clearable" value="" :disabled="!clearable">{{ placeholder }}</option>
      <option v-for="option in options" :key="String(option.value)" :value="String(option.value)" :disabled="option.disabled">{{ option.label }}</option>
    </select>
    <span class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-slate-400">
      <UiIcon name="chevronDown" :size="14" />
    </span>
  </div>
</template>
