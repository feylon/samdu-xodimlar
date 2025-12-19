import { io, type Socket } from 'socket.io-client'
import type { AppNotification, Paginated } from '~/types/api'

interface SecurityAlertPayload {
  kind: string
  sessionId: string
  client: string
  ip: string
  device: string
  browser: string
  os: string
  at: string
}

export const useNotificationsStore = defineStore('notifications', () => {
  const latest = ref<AppNotification[]>([])
  const unreadCount = ref(0)
  const connected = ref(false)
  let socket: Socket | null = null

  const fetchLatest = async () => {
    const api = useApi()
    const response = await api.get<Paginated<AppNotification>>('/notifications', { page: 1, limit: 8 })
    latest.value = response.items
    return response
  }

  const fetchUnread = async () => {
    const api = useApi()
    const response = await api.get<{ count: number }>('/notifications/unread-count')
    unreadCount.value = response.count
  }

  const markRead = async (id: string) => {
    const api = useApi()
    const updated = await api.patch<AppNotification>(`/notifications/${id}/read`)
    const target = latest.value.find((item) => item.id === id)
    if (target && !target.readAt) {
      target.readAt = updated.readAt
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
    return updated
  }

  const markAllRead = async () => {
    const api = useApi()
    await api.post('/notifications/read-all')
    const now = new Date().toISOString()
    latest.value = latest.value.map((item) => ({ ...item, readAt: item.readAt ?? now }))
    unreadCount.value = 0
  }

  const handleNotification = (notification: AppNotification) => {
    latest.value = [notification, ...latest.value.filter((item) => item.id !== notification.id)].slice(0, 8)
    unreadCount.value += 1
    const ui = useUiStore()
    ui.pushToast({ type: 'info', title: notification.title, message: notification.body })
  }

  const handleSecurityAlert = (payload: SecurityAlertPayload) => {
    const ui = useUiStore()
    const { t } = useTranslate()
    ui.pushToast({
      type: 'warning',
      title: t('socket.newLoginTitle'),
      message: t('socket.newLoginBody', { device: `${payload.device} · ${payload.os} · ${payload.browser}`, ip: payload.ip }),
      timeout: 15000,
    })
  }

  const handleSessionTerminated = (payload: { reason: string }) => {
    const auth = useAuthStore()
    void auth.forceLogout(payload.reason)
  }

  const disconnect = () => {
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      socket = null
    }
    connected.value = false
  }

  const connect = (token: string) => {
    disconnect()
    const config = useRuntimeConfig()
    socket = io(`${config.public.wsBase}/ws`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 15000,
    })
    socket.on('connect', () => {
      connected.value = true
    })
    socket.on('disconnect', () => {
      connected.value = false
    })
    socket.on('notification', handleNotification)
    socket.on('notification.unread', (payload: { count: number }) => {
      unreadCount.value = payload.count
    })
    socket.on('security.alert', handleSecurityAlert)
    socket.on('session.terminated', handleSessionTerminated)
  }

  const reconnect = (token: string) => {
    if (!socket) {
      connect(token)
      return
    }
    socket.auth = { token }
    socket.disconnect()
    socket.connect()
  }

  const reset = () => {
    latest.value = []
    unreadCount.value = 0
  }

  return { latest, unreadCount, connected, fetchLatest, fetchUnread, markRead, markAllRead, connect, reconnect, disconnect, reset }
})
