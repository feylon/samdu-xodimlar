import dayjs from 'dayjs'

export const todayIso = (): string => dayjs().format('YYYY-MM-DD')

export const currentPeriod = (): { year: number; month: number } => {
  const now = dayjs()
  return { year: now.year(), month: now.month() + 1 }
}

export const monthStart = (year: number, month: number): string => dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD')

export const monthEnd = (year: number, month: number): string => dayjs(monthStart(year, month)).endOf('month').format('YYYY-MM-DD')

export const daysInMonth = (year: number, month: number): number => dayjs(monthStart(year, month)).daysInMonth()

export const shiftPeriod = (period: { year: number; month: number }, delta: number): { year: number; month: number } => {
  const next = dayjs(monthStart(period.year, period.month)).add(delta, 'month')
  return { year: next.year(), month: next.month() + 1 }
}

export const periodKey = (year: number, month: number): string => `${year}-${String(month).padStart(2, '0')}`

export const eachDate = (start: string, end: string): string[] => {
  const result: string[] = []
  let cursor = dayjs(start)
  const last = dayjs(end)
  while (!cursor.isAfter(last, 'day')) {
    result.push(cursor.format('YYYY-MM-DD'))
    cursor = cursor.add(1, 'day')
  }
  return result
}

export const weekdayMondayFirst = (isoDate: string): number => (dayjs(isoDate).day() + 6) % 7

export const toDateInput = (value: string | Date | null | undefined): string => (value ? dayjs(value).format('YYYY-MM-DD') : '')

export const toDateTimeInput = (value: string | Date | null | undefined): string => (value ? dayjs(value).format('YYYY-MM-DDTHH:mm') : '')
