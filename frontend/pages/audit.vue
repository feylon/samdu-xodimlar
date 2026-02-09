<script setup lang="ts">
import type { AuditLogEntry, LoginHistoryEntry, Paginated, SessionInfo } from '~/types/api'
import type { DataTableColumn } from '~/components/ui/DataTable.vue'

definePageMeta({ title: 'nav.audit', middleware: 'role', roles: ['SUPERADMIN'] })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const format = useFormat()

const tab = ref('logs')
const tabs = computed(() => [
  { key: 'logs', label: t('audit.actionLogs') },
  { key: 'logins', label: t('audit.loginHistory') },
  { key: 'sessions', label: t('audit.activeSessions') },
])

const logFilters = reactive({ userId: null as string | null, action: '', entity: '', method: '', from: '', to: '', onlyErrors: false })
const logPage = ref(1)
const logLimit = ref(20)
const logs = ref<Paginated<AuditLogEntry>>({ items: [], total: 0, page: 1, limit: 20 })
const logsLoading = ref(false)
const debouncedAction = useDebouncedRef(toRef(logFilters, 'action'), 400)
const debouncedEntity = useDebouncedRef(toRef(logFilters, 'entity'), 400)

const loadLogs = async () => {
  logsLoading.value = true
  try {
    logs.value = await api.get<Paginated<AuditLogEntry>>('/audit/logs', {
      userId: logFilters.userId ?? undefined,
      action: debouncedAction.value || undefined,
      entity: debouncedEntity.value || undefined,
      method: logFilters.method || undefined,
      from: logFilters.from || undefined,
      to: logFilters.to || undefined,
      onlyErrors: logFilters.onlyErrors ? 'true' : undefined,
      page: logPage.value,
      limit: logLimit.value,
    })
  } catch (error) {
    ui.toastError(error)
  } finally {
    logsLoading.value = false
  }
}
watch([debouncedAction, debouncedEntity, () => logFilters.userId, () => logFilters.method, () => logFilters.from, () => logFilters.to, () => logFilters.onlyErrors], () => {
  logPage.value = 1
  void loadLogs()
})
watch([logPage, logLimit], loadLogs)

const loginFilters = reactive({ userId: null as string | null, login: '', success: '' })
const loginPage = ref(1)
const loginLimit = ref(20)
const logins = ref<Paginated<LoginHistoryEntry>>({ items: [], total: 0, page: 1, limit: 20 })
const loginsLoading = ref(false)
const debouncedLogin = useDebouncedRef(toRef(loginFilters, 'login'), 400)
const loadLogins = async () => {
  loginsLoading.value = true
  try {
    logins.value = await api.get<Paginated<LoginHistoryEntry>>('/audit/login-history', {
      userId: loginFilters.userId ?? undefined,
      login: debouncedLogin.value || undefined,
      success: loginFilters.success || undefined,
      page: loginPage.value,
      limit: loginLimit.value,
    })
  } catch (error) {
    ui.toastError(error)
  } finally {
    loginsLoading.value = false
  }
}
watch([debouncedLogin, () => loginFilters.userId, () => loginFilters.success], () => {
  loginPage.value = 1
  void loadLogins()
})
watch([loginPage, loginLimit], loadLogins)

const sessionFilters = reactive({ userId: null as string | null, client: '' })
const sessionPage = ref(1)
const sessionLimit = ref(20)
const sessions = ref<Paginated<SessionInfo>>({ items: [], total: 0, page: 1, limit: 20 })
const sessionsLoading = ref(false)
const loadSessions = async () => {
  sessionsLoading.value = true
  try {
    sessions.value = await api.get<Paginated<SessionInfo>>('/audit/sessions', { userId: sessionFilters.userId ?? undefined, client: sessionFilters.client || undefined, page: sessionPage.value, limit: sessionLimit.value })
  } catch (error) {
    ui.toastError(error)
  } finally {
    sessionsLoading.value = false
  }
}
watch(
  sessionFilters,
  () => {
    sessionPage.value = 1
    void loadSessions()
  },
  { deep: true },
)
watch([sessionPage, sessionLimit], loadSessions)

const loaded = reactive({ logs: false, logins: false, sessions: false })
watch(
  tab,
  (value) => {
    if (value === 'logs' && !loaded.logs) {
      loaded.logs = true
      void loadLogs()
    }
    if (value === 'logins' && !loaded.logins) {
      loaded.logins = true
      void loadLogins()
    }
    if (value === 'sessions' && !loaded.sessions) {
      loaded.sessions = true
      void loadSessions()
    }
  },
  { immediate: true },
)

const methodOptions = ['POST', 'PUT', 'PATCH', 'DELETE'].map((method) => ({ value: method, label: method }))
const successOptions = computed(() => [
  { value: 'true', label: t('security.success') },
  { value: 'false', label: t('security.failure') },
])
const clientOptions = computed(() => [
  { value: 'WEB', label: t('enums.Client.WEB') },
  { value: 'MOBILE', label: t('enums.Client.MOBILE') },
])

const logColumns = computed<DataTableColumn<AuditLogEntry>[]>(() => [
  { key: 'createdAt', label: t('common.date'), type: 'datetime' },
  { key: 'actorLogin', label: t('audit.actor'), format: (row) => (row.actorLogin ? `${row.actorLogin}${row.actorRole ? ` (${row.actorRole})` : ''}` : '') },
  { key: 'action', label: t('audit.action') },
  { key: 'method', label: t('audit.method') },
  { key: 'path', label: t('audit.path') },
  { key: 'entity', label: t('audit.entity'), format: (row) => (row.entity ? `${row.entity}${row.entityId ? ` #${row.entityId.slice(0, 8)}` : ''}` : '') },
  { key: 'statusCode', label: t('audit.statusCode'), type: 'number', align: 'center' },
  { key: 'durationMs', label: t('audit.duration'), type: 'number', align: 'right', format: (row) => `${row.durationMs} ms` },
  { key: 'ip', label: 'IP' },
])

const loginColumns = computed<DataTableColumn<LoginHistoryEntry>[]>(() => [
  { key: 'createdAt', label: t('common.date'), type: 'datetime' },
  { key: 'login', label: t('auth.loginField') },
  { key: 'success', label: t('common.status'), format: (row) => (row.success ? t('security.success') : t('security.failure')) },
  { key: 'failureReason', label: t('security.failureReason'), format: (row) => (row.failureReason ? t(`errors.${row.failureReason}`) : '') },
  { key: 'client', label: t('security.client') },
  { key: 'device', label: t('security.device'), format: (row) => `${row.device} · ${row.os} · ${row.browser}` },
  { key: 'ip', label: 'IP' },
])

const sessionColumns = computed<DataTableColumn<SessionInfo>[]>(() => [
  { key: 'userId', label: t('audit.userId') },
  { key: 'client', label: t('security.client') },
  { key: 'device', label: t('security.device'), format: (row) => `${row.deviceName || row.device} · ${row.os} · ${row.browser}` },
  { key: 'ip', label: 'IP' },
  { key: 'createdAt', label: t('security.signedIn'), type: 'datetime' },
  { key: 'lastActiveAt', label: t('security.lastActive'), type: 'datetime' },
  { key: 'expiresAt', label: t('audit.expiresAt'), type: 'datetime' },
])

const expandedLog = ref<AuditLogEntry | null>(null)
const statusTone = (code: number) => (code >= 500 ? 'red' : code >= 400 ? 'amber' : 'green')
const pretty = (value: unknown) => JSON.stringify(value, null, 2)
</script>

<template>
  <div>
    <UiPageHeader :title="t('nav.audit')" :subtitle="t('audit.subtitle')" />
    <UiTabs v-model="tab" :tabs="tabs" class="mb-5" />

    <UiDataTable
      v-if="tab === 'logs'"
      :columns="logColumns"
      :rows="logs.items"
      :total="logs.total"
      :page="logPage"
      :limit="logLimit"
      :loading="logsLoading"
      :export-title="t('audit.actionLogs')"
      clickable
      dense
      @update:page="logPage = $event"
      @update:limit="(logLimit = $event), (logPage = 1)"
      @row-click="expandedLog = $event"
    >
      <template #filters>
        <EmployeesSearch v-model="logFilters.userId" source="users" class="w-56" :placeholder="t('audit.filterUser')" />
        <input v-model="logFilters.action" type="search" class="input w-40 py-1.5 text-xs" :placeholder="t('audit.action')" />
        <input v-model="logFilters.entity" type="search" class="input w-36 py-1.5 text-xs" :placeholder="t('audit.entity')" />
        <UiSelect v-model="logFilters.method" :options="methodOptions" :placeholder="t('audit.method')" size="sm" class="w-32" />
        <input v-model="logFilters.from" type="date" class="input w-36 py-1.5 text-xs" />
        <input v-model="logFilters.to" type="date" class="input w-36 py-1.5 text-xs" />
        <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700">
          <input v-model="logFilters.onlyErrors" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
          {{ t('audit.onlyErrors') }}
        </label>
      </template>
      <template #cell-method="{ row }"><span class="font-mono text-xs font-semibold">{{ row.method }}</span></template>
      <template #cell-path="{ row }"><span class="font-mono text-xs text-slate-600">{{ row.path }}</span></template>
      <template #cell-statusCode="{ row }"><UiBadge :tone="statusTone(row.statusCode)" :label="String(row.statusCode)" :dot="false" /></template>
    </UiDataTable>

    <UiDataTable
      v-else-if="tab === 'logins'"
      :columns="loginColumns"
      :rows="logins.items"
      :total="logins.total"
      :page="loginPage"
      :limit="loginLimit"
      :loading="loginsLoading"
      :export-title="t('audit.loginHistory')"
      dense
      @update:page="loginPage = $event"
      @update:limit="(loginLimit = $event), (loginPage = 1)"
    >
      <template #filters>
        <EmployeesSearch v-model="loginFilters.userId" source="users" class="w-56" :placeholder="t('audit.filterUser')" />
        <input v-model="loginFilters.login" type="search" class="input w-40 py-1.5 text-xs" :placeholder="t('auth.loginField')" />
        <UiSelect v-model="loginFilters.success" :options="successOptions" :placeholder="t('common.allStatuses')" size="sm" class="w-36" />
      </template>
      <template #cell-success="{ row }"><UiBadge :tone="row.success ? 'green' : 'red'" :label="row.success ? t('security.success') : t('security.failure')" /></template>
      <template #cell-client="{ row }"><UiBadge enum-name="Client" :value="row.client" :dot="false" /></template>
    </UiDataTable>

    <UiDataTable
      v-else
      :columns="sessionColumns"
      :rows="sessions.items"
      :total="sessions.total"
      :page="sessionPage"
      :limit="sessionLimit"
      :loading="sessionsLoading"
      :export-title="t('audit.activeSessions')"
      dense
      @update:page="sessionPage = $event"
      @update:limit="(sessionLimit = $event), (sessionPage = 1)"
    >
      <template #filters>
        <EmployeesSearch v-model="sessionFilters.userId" source="users" class="w-56" :placeholder="t('audit.filterUser')" />
        <UiSelect v-model="sessionFilters.client" :options="clientOptions" :placeholder="t('security.client')" size="sm" class="w-36" />
      </template>
      <template #cell-userId="{ row }">
        <NuxtLink :to="`/employees/${row.userId}`" class="font-mono text-xs text-brand hover:underline">{{ row.userId.slice(0, 8) }}…</NuxtLink>
      </template>
      <template #cell-client="{ row }"><UiBadge enum-name="Client" :value="row.client" :dot="false" /></template>
    </UiDataTable>

    <UiDrawer :open="expandedLog !== null" :title="expandedLog?.action ?? ''" :subtitle="expandedLog ? `${expandedLog.method} ${expandedLog.path}` : ''" width="xl" @close="expandedLog = null">
      <div v-if="expandedLog" class="space-y-4">
        <div class="flex flex-wrap items-center gap-2">
          <UiBadge :tone="statusTone(expandedLog.statusCode)" :label="String(expandedLog.statusCode)" :dot="false" />
          <span class="text-xs text-slate-500">{{ format.dateTime(expandedLog.createdAt) }} · {{ expandedLog.durationMs }} ms · IP {{ expandedLog.ip }}</span>
        </div>
        <dl class="grid grid-cols-2 gap-3 text-sm">
          <div><dt class="text-xs text-slate-500">{{ t('audit.actor') }}</dt><dd class="font-medium text-slate-800">{{ expandedLog.actorLogin ?? '—' }} <span v-if="expandedLog.actorRole" class="text-xs text-slate-500">({{ expandedLog.actorRole }})</span></dd></div>
          <div><dt class="text-xs text-slate-500">{{ t('audit.userId') }}</dt><dd class="font-mono text-xs text-slate-800 break-all">{{ expandedLog.actorId ?? '—' }}</dd></div>
          <div><dt class="text-xs text-slate-500">{{ t('audit.entity') }}</dt><dd class="font-medium text-slate-800">{{ expandedLog.entity ?? '—' }}</dd></div>
          <div><dt class="text-xs text-slate-500">{{ t('audit.entityId') }}</dt><dd class="font-mono text-xs text-slate-800 break-all">{{ expandedLog.entityId ?? '—' }}</dd></div>
          <div class="col-span-2"><dt class="text-xs text-slate-500">{{ t('audit.userAgent') }}</dt><dd class="text-xs text-slate-700 break-all">{{ expandedLog.userAgent }}</dd></div>
        </dl>
        <div v-if="expandedLog.errorMessage" class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ expandedLog.errorMessage }}</div>
        <div>
          <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('audit.query') }}</h4>
          <pre class="max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">{{ pretty(expandedLog.query ?? {}) }}</pre>
        </div>
        <div>
          <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('audit.payload') }}</h4>
          <pre class="max-h-96 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">{{ pretty(expandedLog.payload ?? {}) }}</pre>
        </div>
      </div>
    </UiDrawer>
  </div>
</template>
