<script setup lang="ts">
import type { AppNotification, Paginated } from '~/types/api'
import { notificationTarget } from '~/utils/navigation'
import { TONE_DOT_CLASSES, toneFor } from '~/utils/enums'

definePageMeta({ title: 'nav.notifications' })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const format = useFormat()
const router = useRouter()
const notifications = useNotificationsStore()

const unreadOnly = ref(false)
const page = ref(1)
const limit = ref(20)
const data = ref<Paginated<AppNotification>>({ items: [], total: 0, page: 1, limit: 20 })
const loading = ref(false)

const load = async () => {
  loading.value = true
  try {
    data.value = await api.get<Paginated<AppNotification>>('/notifications', { page: page.value, limit: limit.value, unreadOnly: unreadOnly.value ? 'true' : undefined })
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}
watch(unreadOnly, () => {
  page.value = 1
  void load()
})
watch([page, limit], load)
onMounted(load)

const pageCount = computed(() => Math.max(1, Math.ceil(data.value.total / limit.value)))

const open = async (item: AppNotification) => {
  if (!item.readAt) {
    try {
      const updated = await notifications.markRead(item.id)
      item.readAt = updated.readAt
    } catch (error) {
      ui.toastError(error)
    }
  }
  const target = notificationTarget(item.data)
  if (target) await router.push(target)
}

const markOne = async (item: AppNotification) => {
  try {
    const updated = await notifications.markRead(item.id)
    item.readAt = updated.readAt
  } catch (error) {
    ui.toastError(error)
  }
}

const markAll = async () => {
  try {
    await notifications.markAllRead()
    await load()
    ui.success('notifications.allMarked')
  } catch (error) {
    ui.toastError(error)
  }
}
</script>

<template>
  <div>
    <UiPageHeader :title="t('nav.notifications')" :subtitle="t('notifications.subtitle', { unread: notifications.unreadCount })">
      <label class="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
        <input v-model="unreadOnly" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
        {{ t('notifications.unreadOnly') }}
      </label>
      <button type="button" class="btn-secondary" :disabled="notifications.unreadCount === 0" @click="markAll">
        <UiIcon name="check" :size="16" />
        {{ t('notifications.markAllRead') }}
      </button>
    </UiPageHeader>

    <div class="card">
      <div v-if="loading && data.items.length === 0" class="space-y-2 p-4"><div v-for="index in 6" :key="index" class="skeleton h-14" /></div>
      <UiEmptyState v-else-if="data.items.length === 0" :title="t('notifications.empty')" icon="bell" />
      <ul v-else class="divide-y divide-slate-100">
        <li v-for="item in data.items" :key="item.id" class="flex items-start gap-3 px-5 py-3.5 transition hover:bg-slate-50" :class="item.readAt ? '' : 'bg-brand/[0.03]'">
          <span class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" :class="item.readAt ? 'bg-slate-200' : TONE_DOT_CLASSES[toneFor('NotificationType', item.type)]" />
          <button type="button" class="min-w-0 flex-1 text-left" @click="open(item)">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-medium text-slate-900">{{ item.title }}</span>
              <UiBadge enum-name="NotificationType" :value="item.type" :dot="false" />
            </div>
            <p class="mt-0.5 text-sm text-slate-600">{{ item.body }}</p>
            <p class="mt-1 text-[11px] text-slate-400">{{ format.dateTime(item.createdAt) }} · {{ format.relative(item.createdAt) }}</p>
          </button>
          <div class="flex shrink-0 items-center gap-1">
            <button v-if="!item.readAt" type="button" class="btn-icon" :title="t('notifications.markRead')" @click="markOne(item)"><UiIcon name="check" :size="16" /></button>
            <button v-if="notificationTarget(item.data)" type="button" class="btn-icon" :title="t('common.open')" @click="open(item)"><UiIcon name="chevronRight" :size="16" /></button>
          </div>
        </li>
      </ul>
      <div v-if="data.total > 0" class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-600">
        <span>{{ t('common.totalCount', { total: data.total }) }} · {{ t('common.page') }} {{ page }} / {{ pageCount }}</span>
        <div class="flex items-center gap-1">
          <button type="button" class="btn-icon p-1.5" :disabled="page <= 1" @click="page -= 1"><UiIcon name="chevronLeft" :size="14" /></button>
          <button type="button" class="btn-icon p-1.5" :disabled="page >= pageCount" @click="page += 1"><UiIcon name="chevronRight" :size="14" /></button>
        </div>
      </div>
    </div>
  </div>
</template>
