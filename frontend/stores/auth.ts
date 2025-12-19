import type { AuthUser, LoginResponse, UserRole } from '~/types/api'

const STORAGE_KEY = 'hrms.auth'

interface PersistedAuth {
  accessToken: string | null
  refreshToken: string | null
  sessionId: string | null
  user: AuthUser | null
}

const readPersisted = (): PersistedAuth => {
  const empty: PersistedAuth = { accessToken: null, refreshToken: null, sessionId: null, user: null }
  if (typeof localStorage === 'undefined') return empty
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<PersistedAuth>
    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      sessionId: parsed.sessionId ?? null,
      user: parsed.user ?? null,
    }
  } catch {
    return empty
  }
}

export const useAuthStore = defineStore('auth', () => {
  const persisted = readPersisted()
  const accessToken = ref<string | null>(persisted.accessToken)
  const refreshToken = ref<string | null>(persisted.refreshToken)
  const sessionId = ref<string | null>(persisted.sessionId)
  const user = ref<AuthUser | null>(persisted.user)

  const role = computed<UserRole | null>(() => user.value?.role ?? null)
  const isAuthenticated = computed(() => Boolean(accessToken.value))
  const isSuperadmin = computed(() => role.value === 'SUPERADMIN')
  const isHr = computed(() => role.value === 'HR')
  const isHead = computed(() => role.value === 'DEPARTMENT_HEAD')
  const isEmployee = computed(() => role.value === 'EMPLOYEE')
  const isManagement = computed(() => isSuperadmin.value || isHr.value)
  const mustChangePassword = computed(() => Boolean(user.value?.mustChangePassword))

  const hasRole = (roles: UserRole[] | undefined): boolean => !roles || roles.length === 0 || (role.value !== null && roles.includes(role.value))

  const persist = () => {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ accessToken: accessToken.value, refreshToken: refreshToken.value, sessionId: sessionId.value, user: user.value }),
      )
    } catch {
      return
    }
  }

  watch([accessToken, refreshToken, sessionId, user], persist, { deep: true })

  const applyTokens = (response: LoginResponse) => {
    accessToken.value = response.accessToken
    refreshToken.value = response.refreshToken
    sessionId.value = response.sessionId
    user.value = { ...(user.value ?? {}), ...response.user, sessionId: response.sessionId }
  }

  const clear = () => {
    accessToken.value = null
    refreshToken.value = null
    sessionId.value = null
    user.value = null
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        return
      }
    }
  }

  const apiBase = () => useRuntimeConfig().public.apiBase

  const login = async (loginValue: string, password: string) => {
    const response = await $fetch<LoginResponse>('/auth/login', {
      baseURL: apiBase(),
      method: 'POST',
      body: { login: loginValue, password },
    })
    applyTokens(response)
    const notifications = useNotificationsStore()
    notifications.connect(response.accessToken)
    await Promise.all([fetchMe().catch(() => undefined), notifications.fetchUnread().catch(() => undefined)])
    return response
  }

  const fetchMe = async () => {
    const api = useApi()
    const me = await api.get<AuthUser>('/auth/me')
    user.value = me
    return me
  }

  const refresh = async (): Promise<boolean> => {
    if (!refreshToken.value) return false
    try {
      const response = await $fetch<LoginResponse>('/auth/refresh', {
        baseURL: apiBase(),
        method: 'POST',
        body: { refreshToken: refreshToken.value },
      })
      applyTokens(response)
      useNotificationsStore().reconnect(response.accessToken)
      return true
    } catch {
      return false
    }
  }

  const redirectToLogin = async () => {
    const router = useRouter()
    if (router.currentRoute.value.path === '/login') return
    try {
      await navigateTo('/login')
    } catch {
      return
    }
  }

  const logout = async () => {
    const token = accessToken.value
    if (token) {
      try {
        await $fetch('/auth/logout', { baseURL: apiBase(), method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      } catch {
        clear()
      }
    }
    useNotificationsStore().disconnect()
    clear()
    await redirectToLogin()
  }

  const forceLogout = async (reasonKey?: string) => {
    useNotificationsStore().disconnect()
    const wasAuthenticated = Boolean(accessToken.value)
    clear()
    if (reasonKey && wasAuthenticated) {
      const ui = useUiStore()
      const { t, te } = useTranslate()
      const key = `auth.logoutReasons.${reasonKey}`
      ui.warning(t('auth.sessionEnded'), te(key) ? t(key) : reasonKey, 8000)
    }
    await redirectToLogin()
  }

  const updateUser = (patch: Partial<AuthUser>) => {
    if (user.value) user.value = { ...user.value, ...patch }
  }

  return {
    accessToken,
    refreshToken,
    sessionId,
    user,
    role,
    isAuthenticated,
    isSuperadmin,
    isHr,
    isHead,
    isEmployee,
    isManagement,
    mustChangePassword,
    hasRole,
    login,
    logout,
    forceLogout,
    fetchMe,
    refresh,
    updateUser,
  }
})
