import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'

export default defineNuxtPlugin(() => {
  Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, Legend, Tooltip)
  Chart.defaults.font.family = "'Inter', ui-sans-serif, system-ui, sans-serif"
  Chart.defaults.font.size = 12
  Chart.defaults.color = '#64748b'
  Chart.defaults.plugins.legend.labels.boxWidth = 10
  Chart.defaults.plugins.legend.labels.boxHeight = 10
  Chart.defaults.plugins.legend.labels.usePointStyle = true
  Chart.defaults.plugins.tooltip.backgroundColor = '#0f172a'
  Chart.defaults.plugins.tooltip.padding = 10
  Chart.defaults.plugins.tooltip.cornerRadius = 8
})
