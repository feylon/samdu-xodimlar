import dayjs from 'dayjs'

export const useFormat = () => {
  const organization = useOrganizationStore()
  const { t, locale } = useTranslate()

  const numberFormatter = computed(() => new Intl.NumberFormat(locale.value === 'ru' ? 'ru-RU' : 'uz-UZ', { maximumFractionDigits: 2 }))

  const number = (value: number | string | null | undefined, fractionDigits?: number): string => {
    if (value === null || value === undefined || value === '') return '—'
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return String(value)
    if (fractionDigits !== undefined) {
      return new Intl.NumberFormat(locale.value === 'ru' ? 'ru-RU' : 'uz-UZ', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(numeric)
    }
    return numberFormatter.value.format(numeric)
  }

  const money = (value: number | string | null | undefined, currency?: string): string => {
    if (value === null || value === undefined || value === '') return '—'
    const numeric = Number(value)
    if (Number.isNaN(numeric)) return String(value)
    return `${numberFormatter.value.format(numeric)} ${currency ?? organization.currency}`
  }

  const date = (value: string | Date | null | undefined): string => (value ? dayjs(value).format('DD.MM.YYYY') : '—')

  const dateTime = (value: string | Date | null | undefined): string => (value ? dayjs(value).format('DD.MM.YYYY HH:mm') : '—')

  const time = (value: string | null | undefined): string => value ?? '—'

  const percent = (ratio: number | string | null | undefined, fractionDigits = 0): string => {
    if (ratio === null || ratio === undefined || ratio === '') return '—'
    const numeric = Number(ratio)
    if (Number.isNaN(numeric)) return String(ratio)
    return `${(numeric * 100).toFixed(fractionDigits)}%`
  }

  const monthName = (month: number): string => t(`months.${month}`)

  const period = (year: number, month: number): string => `${monthName(month)} ${year}`

  const relative = (value: string | Date | null | undefined): string => {
    if (!value) return '—'
    const target = dayjs(value)
    const diffMinutes = dayjs().diff(target, 'minute')
    if (diffMinutes < 1) return t('time.justNow')
    if (diffMinutes < 60) return t('time.minutesAgo', { n: diffMinutes })
    const diffHours = dayjs().diff(target, 'hour')
    if (diffHours < 24) return t('time.hoursAgo', { n: diffHours })
    const diffDays = dayjs().diff(target, 'day')
    if (diffDays < 7) return t('time.daysAgo', { n: diffDays })
    return target.format('DD.MM.YYYY')
  }

  const points = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '—'
    return value > 0 ? `+${value}` : String(value)
  }

  const fileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return { number, money, date, dateTime, time, percent, monthName, period, relative, points, fileSize }
}
