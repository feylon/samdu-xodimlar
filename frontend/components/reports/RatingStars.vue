<script setup lang="ts">
withDefaults(defineProps<{ modelValue: number | null; readOnly?: boolean; size?: number }>(), { readOnly: false, size: 18 })
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const hover = ref(0)
</script>

<template>
  <div class="inline-flex items-center gap-0.5" @mouseleave="hover = 0">
    <button
      v-for="star in 5"
      :key="star"
      type="button"
      class="transition"
      :class="[readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110', (hover || modelValue || 0) >= star ? 'text-amber-400' : 'text-slate-300']"
      :disabled="readOnly"
      @mouseenter="!readOnly && (hover = star)"
      @click="!readOnly && emit('update:modelValue', star)"
    >
      <svg :width="size" :height="size" viewBox="0 0 24 24" :fill="(hover || modelValue || 0) >= star ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    </button>
  </div>
</template>
