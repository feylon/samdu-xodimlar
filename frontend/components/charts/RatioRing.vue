<script setup lang="ts">
withDefaults(defineProps<{ ratio: number; size?: number; stroke?: number; label?: string }>(), { size: 120, stroke: 10, label: '' })
</script>

<template>
  <div class="relative inline-flex items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" viewBox="0 0 100 100" class="-rotate-90">
      <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" :stroke-width="stroke" />
      <circle
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke="var(--brand)"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="`${Math.max(0, Math.min(1, ratio)) * 263.9} 263.9`"
        class="transition-all duration-700"
      />
    </svg>
    <div class="absolute inset-0 flex flex-col items-center justify-center">
      <span class="text-xl font-semibold tabular-nums text-slate-900">{{ Math.round(Math.max(0, Math.min(1, ratio)) * 100) }}%</span>
      <span v-if="label" class="text-[10px] uppercase tracking-wide text-slate-500">{{ label }}</span>
    </div>
  </div>
</template>
