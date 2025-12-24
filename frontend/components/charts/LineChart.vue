<script setup lang="ts">
import { Line } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { CHART_PALETTE, readBrandColor, withAlpha } from '~/utils/color'

export interface LineDataset {
  label: string
  data: number[]
  color?: string
  fill?: boolean
}

const props = withDefaults(defineProps<{ labels: string[]; datasets: LineDataset[]; height?: number; showLegend?: boolean; valueFormatter?: (value: number) => string }>(), {
  height: 240,
  showLegend: true,
  valueFormatter: undefined,
})

const brand = ref(readBrandColor())
onMounted(() => {
  brand.value = readBrandColor()
})

const chartData = computed<ChartData<'line'>>(() => ({
  labels: props.labels,
  datasets: props.datasets.map((dataset, index) => {
    const color = dataset.color ?? (index === 0 ? brand.value : CHART_PALETTE[index % CHART_PALETTE.length])
    return {
      label: dataset.label,
      data: dataset.data,
      borderColor: color,
      backgroundColor: dataset.fill ? withAlpha(color, 0.12) : color,
      fill: dataset.fill ?? false,
      tension: 0.35,
      pointRadius: 3,
      pointHoverRadius: 5,
      borderWidth: 2,
    }
  }),
}))

const options = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: props.showLegend && props.datasets.length > 1, position: 'bottom' },
    tooltip: {
      callbacks: props.valueFormatter
        ? { label: (context) => `${context.dataset.label}: ${props.valueFormatter?.(Number(context.raw)) ?? context.raw}` }
        : undefined,
    },
  },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkip: true } },
    y: {
      beginAtZero: true,
      grid: { color: '#f1f5f9' },
      border: { display: false },
      ticks: { precision: 0, callback: (value) => (props.valueFormatter ? props.valueFormatter(Number(value)) : value) },
    },
  },
}))
</script>

<template>
  <div :style="{ height: `${height}px` }">
    <Line :data="chartData" :options="options" />
  </div>
</template>
