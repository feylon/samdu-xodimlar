export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  title: string
  message?: string
  timeout: number
}

const SIDEBAR_KEY = 'hrms.sidebar'

const readSidebarState = (): boolean => {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'collapsed'
  } catch {
    return false
  }
}

export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(readSidebarState())
  const mobileSidebarOpen = ref(false)
  const toasts = ref<ToastItem[]>([])
  let sequence = 0

  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
    try {
      localStorage.setItem(SIDEBAR_KEY, sidebarCollapsed.value ? 'collapsed' : 'expanded')
    } catch {
      return
    }
  }

  const openMobileSidebar = () => {
    mobileSidebarOpen.value = true
  }

  const closeMobileSidebar = () => {
    mobileSidebarOpen.value = false
  }

  const removeToast = (id: number) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  const pushToast = (toast: Omit<ToastItem, 'id' | 'timeout'> & { timeout?: number }) => {
    sequence += 1
    const id = sequence
    const timeout = toast.timeout ?? (toast.type === 'error' ? 7000 : 4500)
    toasts.value = [...toasts.value, { ...toast, id, timeout }].slice(-6)
    if (timeout > 0) setTimeout(() => removeToast(id), timeout)
    return id
  }

  const translate = () => useTranslate()

  const success = (titleKey: string, message?: string) => pushToast({ type: 'success', title: translate().t(titleKey), message })
  const info = (titleKey: string, message?: string) => pushToast({ type: 'info', title: translate().t(titleKey), message })
  const warning = (title: string, message?: string, timeout?: number) => pushToast({ type: 'warning', title, message, timeout })
  const error = (title: string, message?: string, timeout?: number) => pushToast({ type: 'error', title, message, timeout })

  const describeError = (err: unknown): { title: string; message?: string } => {
    const { t, te } = translate()
    const apiError = toApiError(err)
    const key = `errors.${apiError.code}`
    const title = te(key) ? t(key) : apiError.code
    const details = Array.isArray(apiError.details) ? apiError.details.map(String).join('; ') : typeof apiError.details === 'string' ? apiError.details : undefined
    return { title, message: details }
  }

  const toastError = (err: unknown) => {
    const described = describeError(err)
    return error(described.title, described.message)
  }

  return {
    sidebarCollapsed,
    mobileSidebarOpen,
    toasts,
    toggleSidebar,
    openMobileSidebar,
    closeMobileSidebar,
    pushToast,
    removeToast,
    success,
    info,
    warning,
    error,
    describeError,
    toastError,
  }
})
