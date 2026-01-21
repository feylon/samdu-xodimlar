<script setup lang="ts">
import type { AttendanceSummary } from '~/types/api'
import { ATTENDANCE_STATUSES, TONE_DOT_CLASSES, toneFor } from '~/utils/enums'
import { currentPeriod, daysInMonth, monthStart, weekdayMondayFirst } from '~/utils/dates'
import dayjs from 'dayjs'

const props = withDefaults(defineProps<{ userId?: string | null }>(), { userId: null })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const format = useFormat()
const enumLabel = useEnumLabel()

const period = ref(currentPeriod())
const summary = ref<AttendanceSummary | null>(null)
const loading = ref(false)

const load = async () => {
  loading.value = true
  try {
    const path = props.userId ? `/attendance/users/${props.userId}/summary` : '/attendance/me'
    summary.value = await api.get<AttendanceSummary>(path, { year: period.value.year, month: period.value.month })
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}

watch([period, () => props.userId], load, { immediate: true, deep: true })

const weekdays = computed(() => [1, 2, 3, 4, 5, 6, 7].map((day) => t(`weekdaysShort.${day}`)))

const cells = computed(() => {
  const start = monthStart(period.value.year, period.value.month)
  const offset = weekdayMondayFirst(start)
  const total = daysInMonth(period.value.year, period.value.month)
  const recordMap = new Map((summary.value?.records ?? []).map((record) => [record.date, record]))
  const today = dayjs().format('YYYY-MM-DD')
  const result: Array<{ date: string | null; day: number | null; record: ReturnType<typeof recordMap.get> | null; isToday: boolean; isWeekend: boolean }> = []
  for (let index = 0; index < offset; index += 1) result.push({ date: null, day: null, record: null, isToday: false, isWeekend: false })
  for (let day = 1; day <= total; day += 1) {
    const date = dayjs(start).date(day).format('YYYY-MM-DD')
    const weekday = weekdayMondayFirst(date)
    result.push({ date, day, record: recordMap.get(date) ?? null, isToday: date === today, isWeekend: weekday >= 5 })
  }
  return result
})

const CELL_TONES: Record<string, string> = {
  PRESENT: 'bg-green-50 border-green-200 text-green-800',
  LATE: 'bg-amber-50 border-amber-200 text-amber-800',
  ABSENT: 'bg-red-50 border-red-200 text-red-800',
  EXCUSED: 'bg-sky-50 border-sky-200 text-sky-800',
  REMOTE: 'bg-violet-50 border-violet-200 text-violet-800',
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <UiMonthPicker v-model="period" />
      <div class="flex flex-wrap gap-2">
        <span v-for="status in ATTENDANCE_STATUSES" :key="status" class="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <span class="h-2.5 w-2.5 rounded-sm" :class="TONE_DOT_CLASSES[toneFor('AttendanceStatus', status)]" />
          {{ enumLabel('AttendanceStatus', status) }}
        </span>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <UiStatCard :label="t('attendance.ratio')" :value="format.percent(summary?.attendanceRatio ?? 0)" icon="chart" tone="green" :loading="loading && !summary" />
      <UiStatCard :label="t('attendance.presentDays')" :value="`${summary?.presentDays ?? 0} / ${summary?.elapsedWorkingDays ?? 0}`" icon="checkCircle" tone="emerald" :hint="t('attendance.elapsedOfWorking', { total: summary?.workingDays ?? 0 })" :loading="loading && !summary" />
      <UiStatCard :label="enumLabel('AttendanceStatus', 'LATE')" :value="summary?.counts.LATE ?? 0" icon="clock" tone="amber" :loading="loading && !summary" />
      <UiStatCard :label="enumLabel('AttendanceStatus', 'ABSENT')" :value="summary?.counts.ABSENT ?? 0" icon="xCircle" tone="red" :loading="loading && !summary" />
    </div>

    <div class="card card-body">
      <div class="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span v-for="label in weekdays" :key="label" class="py-1">{{ label }}</span>
      </div>
      <div class="mt-1.5 grid grid-cols-7 gap-1.5">
        <div v-for="(cell, index) in cells" :key="index" class="min-h-[64px] rounded-lg border p-1.5 text-left transition" :class="[
          cell.date ? (cell.record ? CELL_TONES[cell.record.status] : cell.isWeekend ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-slate-100 bg-white text-slate-700') : 'border-transparent',
          cell.isToday ? 'ring-2 ring-brand/50' : '',
        ]">
          <template v-if="cell.date">
            <span class="text-xs font-semibold tabular-nums">{{ cell.day }}</span>
            <div v-if="cell.record" class="mt-1 space-y-0.5 text-[10px] leading-tight">
              <p class="truncate font-medium">{{ enumLabel('AttendanceStatus', cell.record.status) }}</p>
              <p v-if="cell.record.checkIn || cell.record.checkOut" class="tabular-nums opacity-80">{{ cell.record.checkIn ?? '—' }} – {{ cell.record.checkOut ?? '—' }}</p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
