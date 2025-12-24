<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { CHART_PALETTE } from '~/utils/color'

const props = withDefaults(defineProps<{ labels: string[]; values: number[]; colors?: string[]; height?: number; centerLabel?: string; cutout?: string }>(), {
  colors: undefined,
  height: 220,
  centerLabel: '',
  cutout: '68%',
})

const chartData = computed<ChartData<'doughnut'>>(() => ({
  labels: props.labels,
  datasets: [
    {
      data: props.values,
      backgroundColor: props.colors ?? CHART_PALETTE,
      borderColor: '#ffffff',
      borderWidth: 2,
      hoverOffset: 6,
    },
  ],
}))

const options = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: props.cutout,
  plugins: {
    legend: { position: 'bottom', labels: { padding: 14 } },
  },
}))

const total = computed(() => props.values.reduce((sum, value) => sum + value, 0))
</script>

<template>
  <div class="relative" :style="{ height: `${height}px` }">
    <Doughnut :data="chartData" :options="options" />
    <div v-if="centerLabel" class="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 text-center">
      <p class="text-2xl font-semibold tabular-nums text-slate-900">{{ total }}</p>
      <p class="text-[11px] uppercase tracking-wide text-slate-500">{{ centerLabel }}</p>
    </div>
  </div>
</template>
