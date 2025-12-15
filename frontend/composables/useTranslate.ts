type TranslateFn = (key: string, params?: Record<string, unknown>) => string

interface TranslateApi {
  t: TranslateFn
  te: (key: string) => boolean
  locale: Ref<string>
}

export const useTranslate = (): TranslateApi => {
  const nuxtApp = useNuxtApp()
  const i18n = nuxtApp.$i18n as unknown as { t: TranslateFn; te: (key: string) => boolean; locale: Ref<string> }
  return {
    t: (key, params) => i18n.t(key, params ?? {}),
    te: (key) => i18n.te(key),
    locale: i18n.locale,
  }
}

export const useEnumLabel = () => {
  const { t, te } = useTranslate()
  return (enumName: string, value: string | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '—'
    const key = `enums.${enumName}.${value}`
    return te(key) ? t(key) : String(value)
  }
}
