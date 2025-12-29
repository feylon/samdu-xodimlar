<script setup lang="ts">
import type { AppNotification } from '~/types/api'
import { notificationTarget } from '~/utils/navigation'
import { TONE_DOT_CLASSES, toneFor } from '~/utils/enums'

const { t } = useI18n()
const notifications = useNotificationsStore()
const ui = useUiStore()
const format = useFormat()
const router = useRouter()
const open = ref(false)
const loading = ref(false)

const toggle = async () => {
  open.value = !open.value
  if (open.value) {
    loading.value = true
    try {
      await notifications.fetchLatest()
    } catch (error) {
      ui.toastError(error)
    } finally {
      loading.value = false
    }
  }
}

const close = () => {
  open.value = false
}

const openItem = async (item: AppNotification) => {
  if (!item.readAt) {
    try {
      await notifications.markRead(item.id)
    } catch (error) {
      ui.toastError(error)
    }
  }
  close()
  const target = notificationTarget(item.data)
  await router.push(target ?? '/notifications')
}

const markAll = async () => {
  try {
    await notifications.markAllRead()
  } catch (error) {
    ui.toastError(error)
  }
}
</script>

<template>
  <div v-click-outside="close" class="relative">
    <button type="button" class="btn-icon relative" :aria-label="t('nav.notifications')" @click="toggle">
      <UiIcon name="bell" :size="20" />
      <span
        v-if="notifications.unreadCount > 0"
        class="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"
      >
        {{ notifications.unreadCount > 99 ? '99+' : notifications.unreadCount }}
      </span>
    </button>
    <Transition name="pop">
      <div v-if="open" class="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop sm:w-96">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <p class="text-sm font-semibold text-slate-900">{{ t('nav.notifications') }}</p>
          <button type="button" class="text-xs font-medium text-brand hover:underline disabled:opacity-40" :disabled="notifications.unreadCount === 0" @click="markAll">
            {{ t('notifications.markAllRead') }}
          </button>
        </div>
        <div class="max-h-96 overflow-y-auto">
          <div v-if="loading && notifications.latest.length === 0" class="space-y-2 p-4">
            <div v-for="index in 4" :key="index" class="skeleton h-10" />
          </div>
          <UiEmptyState v-else-if="notifications.latest.length === 0" :title="t('notifications.empty')" compact icon="bell" />
          <button
            v-for="item in notifications.latest"
            v-else
            :key="item.id"
            type="button"
            class="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50"
            :class="item.readAt ? '' : 'bg-brand/[0.04]'"
            @click="openItem(item)"
          >
            <span class="mt-1.5 h-2 w-2 shrink-0 rounded-full" :class="item.readAt ? 'bg-slate-200' : TONE_DOT_CLASSES[toneFor('NotificationType', item.type)]" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-slate-800">{{ item.title }}</span>
              <span class="mt-0.5 line-clamp-2 block text-xs text-slate-500">{{ item.body }}</span>
              <span class="mt-1 block text-[11px] text-slate-400">{{ format.relative(item.createdAt) }}</span>
            </span>
          </button>
        </div>
        <NuxtLink to="/notifications" class="block border-t border-slate-100 px-4 py-2.5 text-center text-xs font-medium text-brand hover:bg-slate-50" @click="close">
          {{ t('notifications.viewAll') }}
        </NuxtLink>
      </div>
    </Transition>
  </div>
</template>
