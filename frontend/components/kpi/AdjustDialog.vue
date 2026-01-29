<script setup lang="ts">
import type { PointTransaction } from '~/types/api'

const props = defineProps<{ open: boolean; userId?: string | null; userLabel?: string }>()
const emit = defineEmits<{ close: []; saved: [transaction: PointTransaction] }>()

const { t } = useI18n()
const api = useApi()
const { pending, run } = useAsyncAction()

const form = reactive({ userId: null as string | null, points: 5, reason: '' })

watch(
  () => props.open,
  (open) => {
    if (open) Object.assign(form, { userId: props.userId ?? null, points: 5, reason: '' })
  },
)

const valid = computed(() => Boolean(form.userId) && Number.isInteger(Number(form.points)) && form.points !== 0 && form.points >= -100 && form.points <= 100 && form.reason.trim().length >= 3)

const submit = async () => {
  if (!valid.value) return
  const result = await run(() => api.post<PointTransaction>('/kpi/adjust', { userId: form.userId, points: Number(form.points), reason: form.reason.trim() }), { successKey: 'kpi.adjusted' })
  if (result) emit('saved', result)
}
</script>

<template>
  <UiModal :open="open" :title="t('kpi.adjustPoints')" :subtitle="userLabel" @close="emit('close')">
    <div class="space-y-4">
      <UiFormField v-if="!userId" :label="t('employees.employee')" required>
        <EmployeesSearch v-model="form.userId" />
      </UiFormField>
      <UiFormField :label="t('kpi.points')" required :hint="t('kpi.adjustHint')">
        <div class="flex items-center gap-2">
          <button type="button" class="btn-secondary px-3" @click="form.points = Math.max(-100, form.points - 1)"><UiIcon name="minus" :size="14" /></button>
          <input v-model.number="form.points" type="number" min="-100" max="100" class="input w-28 text-center tabular-nums" />
          <button type="button" class="btn-secondary px-3" @click="form.points = Math.min(100, form.points + 1)"><UiIcon name="plus" :size="14" /></button>
          <span class="text-sm font-semibold" :class="form.points >= 0 ? 'text-green-700' : 'text-red-600'">{{ form.points > 0 ? `+${form.points}` : form.points }}</span>
        </div>
      </UiFormField>
      <UiFormField :label="t('kpi.reason')" required>
        <textarea v-model="form.reason" rows="3" class="input" />
      </UiFormField>
    </div>
    <template #footer>
      <button type="button" class="btn-secondary" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button type="button" class="btn-primary" :disabled="!valid || pending" @click="submit">
        <UiSpinner v-if="pending" />
        {{ t('common.save') }}
      </button>
    </template>
  </UiModal>
</template>
