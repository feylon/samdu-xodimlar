<script setup lang="ts">
withDefaults(defineProps<{ open: boolean; title: string; message?: string; confirmLabel?: string; danger?: boolean; pending?: boolean }>(), {
  message: '',
  confirmLabel: '',
  danger: false,
  pending: false,
})
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const { t } = useI18n()
</script>

<template>
  <UiModal :open="open" :title="title" size="sm" @close="emit('cancel')">
    <p class="text-sm text-slate-600">{{ message }}</p>
    <slot />
    <template #footer>
      <button type="button" class="btn-secondary" :disabled="pending" @click="emit('cancel')">{{ t('common.cancel') }}</button>
      <button type="button" :class="danger ? 'btn-danger' : 'btn-primary'" :disabled="pending" @click="emit('confirm')">
        <UiSpinner v-if="pending" />
        {{ confirmLabel || t('common.confirm') }}
      </button>
    </template>
  </UiModal>
</template>
