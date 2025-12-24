<script setup lang="ts">
import type { ToastType } from '~/stores/ui'

const ui = useUiStore()

const ICONS: Record<ToastType, string> = { success: 'checkCircle', error: 'xCircle', warning: 'warning', info: 'info' }
const COLORS: Record<ToastType, string> = {
  success: 'text-green-600 bg-green-50',
  error: 'text-red-600 bg-red-50',
  warning: 'text-amber-600 bg-amber-50',
  info: 'text-sky-600 bg-sky-50',
}
const BORDERS: Record<ToastType, string> = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-sky-500',
}
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      <TransitionGroup name="toast">
        <div
          v-for="toast in ui.toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-start gap-3 rounded-lg border border-slate-200 border-l-4 bg-white p-3.5 shadow-pop"
          :class="BORDERS[toast.type]"
        >
          <span class="mt-0.5 rounded-full p-1" :class="COLORS[toast.type]">
            <UiIcon :name="ICONS[toast.type]" :size="16" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-slate-900">{{ toast.title }}</p>
            <p v-if="toast.message" class="mt-0.5 text-xs leading-relaxed text-slate-600 break-words">{{ toast.message }}</p>
          </div>
          <button type="button" class="btn-icon -mr-1 -mt-1 p-1" @click="ui.removeToast(toast.id)">
            <UiIcon name="close" :size="14" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
