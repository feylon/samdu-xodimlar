<script setup lang="ts">
withDefaults(defineProps<{ title?: string; description?: string; icon?: string; compact?: boolean }>(), { title: '', description: '', icon: 'inbox', compact: false })
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center" :class="compact ? 'py-6' : 'py-14'">
    <span class="rounded-2xl bg-slate-100 p-3 text-slate-400">
      <UiIcon :name="icon" :size="compact ? 22 : 28" />
    </span>
    <p class="mt-3 text-sm font-medium text-slate-700">{{ title || t('common.noData') }}</p>
    <p v-if="description" class="mt-1 max-w-sm text-xs text-slate-500">{{ description }}</p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>
