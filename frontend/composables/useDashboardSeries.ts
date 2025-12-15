import dayjs from 'dayjs'
import type { AttendanceSeriesPoint, AttendanceStatus, PayrollTrendPoint, TaskStatus } from '~/types/api'
import { ATTENDANCE_STATUSES, TASK_STATUSES, hexFor } from '~/utils/enums'

export const useDashboardSeries = () => {
  const enumLabel = useEnumLabel()
  const format = useFormat()

  const attendanceSeries = (points: AttendanceSeriesPoint[]) => {
    const dates = [...new Set(points.map((point) => point.date))].sort()
    const datasets = ATTENDANCE_STATUSES.map((status) => ({
      label: enumLabel('AttendanceStatus', status),
      color: hexFor('AttendanceStatus', status),
      data: dates.map((date) => {
        const match = points.find((point) => point.date === date && point.status === status)
        return match ? Number(match.count) : 0
      }),
    })).filter((dataset) => dataset.data.some((value) => value > 0))
    return { labels: dates.map((date) => dayjs(date).format('DD.MM')), datasets }
  }

  const statusDistribution = <T extends string>(enumName: string, order: T[], counts: Partial<Record<T, number>>) => {
    const entries = order.filter((status) => (counts[status] ?? 0) > 0)
    return {
      labels: entries.map((status) => enumLabel(enumName, status)),
      values: entries.map((status) => counts[status] ?? 0),
      colors: entries.map((status) => hexFor(enumName, status)),
    }
  }

  const taskDistribution = (counts: Partial<Record<TaskStatus, number>>) => statusDistribution('TaskStatus', TASK_STATUSES, counts)

  const attendanceDistribution = (counts: Partial<Record<AttendanceStatus, number>>) => statusDistribution('AttendanceStatus', ATTENDANCE_STATUSES, counts)

  const payrollTrend = (points: PayrollTrendPoint[]) => {
    const sorted = [...points].sort((a, b) => a.year - b.year || a.month - b.month)
    return { labels: sorted.map((point) => `${format.monthName(point.month).slice(0, 3)} ${String(point.year).slice(2)}`), values: sorted.map((point) => point.total) }
  }

  const sumValues = (counts: Partial<Record<string, number>>, keys: string[]) => keys.reduce((sum, key) => sum + (counts[key] ?? 0), 0)

  return { attendanceSeries, taskDistribution, attendanceDistribution, statusDistribution, payrollTrend, sumValues }
}
