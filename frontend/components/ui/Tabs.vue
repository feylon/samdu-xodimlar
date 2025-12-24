<script setup lang="ts">
export interface TabItem {
  key: string
  label: string
  count?: number
}

defineProps<{ tabs: TabItem[]; modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="flex gap-1 overflow-x-auto border-b border-slate-200">
    <button v-for="tab in tabs" :key="tab.key" type="button" class="tab" :class="{ 'tab-active': tab.key === modelValue }" @click="emit('update:modelValue', tab.key)">
      {{ tab.label }}
      <span v-if="tab.count !== undefined" class="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{{ tab.count }}</span>
    </button>
  </div>
</template>
