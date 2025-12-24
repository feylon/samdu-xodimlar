<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { CHART_PALETTE, readBrandColor } from '~/utils/color'

export interface BarDataset {
  label: string
  data: number[]
  color?: string
}

const props = withDefaults(
  defineProps<{ labels: string[]; datasets: BarDataset[]; horizontal?: boolean; stacked?: boolean; height?: number; showLegend?: boolean; valueFormatter?: (value: number) => string }>(),
  { horizontal: false, stacked: false, height: 240, showLegend: true, valueFormatter: undefined },
)

const brand = ref(readBrandColor())
onMounted(() => {
  brand.value = readBrandColor()
})

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.labels,
  datasets: props.datasets.map((dataset, index) => ({
    label: dataset.label,
    data: dataset.data,
    backgroundColor: dataset.color ?? (index === 0 ? brand.value : CHART_PALETTE[index % CHART_PALETTE.length]),
    borderRadius: 6,
    maxBarThickness: 36,
  })),
}))

const options = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: props.horizontal ? 'y' : 'x',
  plugins: {
    legend: { display: props.showLegend && props.datasets.length > 1, position: 'bottom' },
    tooltip: {
      callbacks: props.valueFormatter
        ? {
            label: (context) => `${context.dataset.label}: ${props.valueFormatter?.(Number(context.raw)) ?? context.raw}`,
          }
        : undefined,
    },
  },
  scales: {
    x: { stacked: props.stacked, grid: { display: props.horizontal, color: '#f1f5f9' }, border: { display: false }, ticks: { maxRotation: 0, autoSkip: true } },
    y: {
      stacked: props.stacked,
      beginAtZero: true,
      grid: { display: !props.horizontal, color: '#f1f5f9' },
      border: { display: false },
      ticks: { precision: 0, callback: (value) => (props.valueFormatter ? props.valueFormatter(Number(value)) : value) },
    },
  },
}))
</script>

<template>
  <div :style="{ height: `${height}px` }">
    <Bar :data="chartData" :options="options" />
  </div>
</template>
