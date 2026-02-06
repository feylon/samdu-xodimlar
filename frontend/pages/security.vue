<script setup lang="ts">
import type { LoginHistoryEntry, Paginated, SessionInfo } from '~/types/api'
import type { DataTableColumn } from '~/components/ui/DataTable.vue'

definePageMeta({ title: 'nav.security' })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const format = useFormat()
const { pending, run } = useAsyncAction()

const sessions = ref<SessionInfo[]>([])
const sessionsLoading = ref(false)
const loadSessions = async () => {
  sessionsLoading.value = true
  try {
    sessions.value = await api.get<SessionInfo[]>('/auth/sessions')
  } catch (error) {
    ui.toastError(error)
  } finally {
    sessionsLoading.value = false
  }
}

const history = ref<Paginated<LoginHistoryEntry>>({ items: [], total: 0, page: 1, limit: 20 })
const historyLoading = ref(false)
const page = ref(1)
const limit = ref(20)
const loadHistory = async () => {
  historyLoading.value = true
  try {
    history.value = await api.get<Paginated<LoginHistoryEntry>>('/auth/login-history', { page: page.value, limit: limit.value })
  } catch (error) {
    ui.toastError(error)
  } finally {
    historyLoading.value = false
  }
}
watch([page, limit], loadHistory)
onMounted(() => {
  void loadSessions()
  void loadHistory()
})

const terminating = ref<SessionInfo | null>(null)
const terminateOne = async () => {
  if (!terminating.value) return
  const result = await run(() => api.delete(`/auth/sessions/${terminating.value?.id}`), { successKey: 'security.sessionTerminated' })
  if (result !== undefined) {
    terminating.value = null
    await loadSessions()
  }
}
const othersOpen = ref(false)
const terminateOthers = async () => {
  const result = await run(() => api.delete<{ terminatedSessions: number }>('/auth/sessions/others'), { silent: true })
  if (result) {
    ui.success('security.othersTerminated', t('users.sessionsTerminatedCount', { count: result.terminatedSessions }))
    othersOpen.value = false
    await loadSessions()
  }
}

const columns = computed<DataTableColumn<LoginHistoryEntry>[]>(() => [
  { key: 'createdAt', label: t('common.date'), type: 'datetime' },
  { key: 'success', label: t('common.status'), format: (row) => (row.success ? t('security.success') : t('security.failure')) },
  { key: 'failureReason', label: t('security.failureReason'), format: (row) => (row.failureReason ? t(`errors.${row.failureReason}`) : '') },
  { key: 'client', label: t('security.client') },
  { key: 'device', label: t('security.device'), format: (row) => `${row.device} · ${row.os}` },
  { key: 'browser', label: t('security.browser') },
  { key: 'ip', label: 'IP' },
])

const othersCount = computed(() => sessions.value.filter((session) => !session.isCurrent).length)
</script>

<template>
  <div class="space-y-6">
    <UiPageHeader :title="t('nav.security')" :subtitle="t('security.subtitle')">
      <button type="button" class="btn-secondary" :disabled="othersCount === 0" @click="othersOpen = true">
        <UiIcon name="logout" :size="16" />
        {{ t('security.terminateOthers') }}
      </button>
    </UiPageHeader>

    <section>
      <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ t('security.activeSessions', { count: sessions.length }) }}</h3>
      <div v-if="sessionsLoading && sessions.length === 0" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><div v-for="index in 3" :key="index" class="card card-body"><div class="skeleton h-5 w-40" /><div class="skeleton mt-2 h-4 w-56" /></div></div>
      <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="session in sessions" :key="session.id" class="card card-body flex items-start gap-3" :class="session.isCurrent ? 'border-brand/40 bg-brand/[0.03]' : ''">
          <span class="rounded-xl p-2.5" :class="session.client === 'MOBILE' ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600'">
            <UiIcon :name="session.client === 'MOBILE' ? 'phone' : 'desktop'" :size="22" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <p class="truncate text-sm font-semibold text-slate-900">{{ session.deviceName || session.device }} · {{ session.os }}</p>
              <UiBadge v-if="session.isCurrent" tone="brand" :label="t('security.current')" />
            </div>
            <p class="text-xs text-slate-500">{{ session.browser }} · {{ session.platform || session.client }}</p>
            <p class="mt-1 text-xs text-slate-500">IP {{ session.ip }}</p>
            <p class="text-[11px] text-slate-400">{{ t('security.lastActive') }}: {{ format.relative(session.lastActiveAt) }} · {{ t('security.signedIn') }}: {{ format.dateTime(session.createdAt) }}</p>
          </div>
          <button v-if="!session.isCurrent" type="button" class="btn-icon text-red-500" :title="t('security.terminate')" @click="terminating = session">
            <UiIcon name="xCircle" :size="18" />
          </button>
        </div>
      </div>
    </section>

    <section>
      <h3 class="mb-3 text-sm font-semibold text-slate-900">{{ t('security.loginHistory') }}</h3>
      <UiDataTable
        :columns="columns"
        :rows="history.items"
        :total="history.total"
        :page="page"
        :limit="limit"
        :loading="historyLoading"
        :export-title="t('security.loginHistory')"
        dense
        @update:page="page = $event"
        @update:limit="(limit = $event), (page = 1)"
      >
        <template #cell-success="{ row }">
          <UiBadge :tone="row.success ? 'green' : 'red'" :label="row.success ? t('security.success') : t('security.failure')" />
        </template>
        <template #cell-client="{ row }"><UiBadge enum-name="Client" :value="row.client" :dot="false" /></template>
      </UiDataTable>
    </section>

    <UiConfirmDialog :open="terminating !== null" :title="t('security.terminate')" :message="terminating ? `${terminating.device} · ${terminating.os} · ${terminating.browser} · IP ${terminating.ip}` : ''" :confirm-label="t('security.terminate')" danger :pending="pending" @confirm="terminateOne" @cancel="terminating = null" />
    <UiConfirmDialog :open="othersOpen" :title="t('security.terminateOthers')" :message="t('security.terminateOthersMessage', { count: othersCount })" :confirm-label="t('security.terminateOthers')" danger :pending="pending" @confirm="terminateOthers" @cancel="othersOpen = false" />
  </div>
</template>
