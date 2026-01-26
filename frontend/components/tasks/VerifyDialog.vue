<script setup lang="ts">
import type { Task } from '~/types/api'

const props = defineProps<{ open: boolean; task: Task | null }>()
const emit = defineEmits<{ close: []; saved: [task: Task] }>()

const { t } = useI18n()
const api = useApi()
const { pending, run } = useAsyncAction()

const verdict = ref<'VERIFIED' | 'REJECTED'>('VERIFIED')
const points = ref(0)
const comment = ref('')

watch(
  () => props.open,
  (open) => {
    if (open && props.task) {
      verdict.value = 'VERIFIED'
      points.value = props.task.status === 'COMPLETED' ? props.task.maxPoints : Math.floor(props.task.maxPoints / 2)
      comment.value = ''
    }
  },
)

const submit = async () => {
  if (!props.task) return
  const result = await run(
    () =>
      api.post<Task>(`/tasks/${props.task?.id}/verify`, {
        verdict: verdict.value,
        points: verdict.value === 'VERIFIED' ? Number(points.value) : undefined,
        comment: comment.value.trim() || undefined,
      }),
    { successKey: verdict.value === 'VERIFIED' ? 'tasks.verified' : 'tasks.rejected' },
  )
  if (result) emit('saved', result)
}
</script>

<template>
  <UiModal :open="open" :title="t('tasks.verify')" :subtitle="task?.title" @close="emit('close')">
    <div v-if="task" class="space-y-4">
      <div class="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <UiBadge enum-name="TaskStatus" :value="task.status" />
        <span>·</span>
        <span>{{ task.assignee?.fullName }}</span>
        <span>·</span>
        <span>{{ t('tasks.maxPoints') }}: {{ task.maxPoints }}</span>
      </div>
      <div v-if="task.employeeComment" class="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t('tasks.employeeComment') }}</p>
        {{ task.employeeComment }}
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition" :class="verdict === 'VERIFIED' ? 'border-green-500 bg-green-50 text-green-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'" @click="verdict = 'VERIFIED'">
          <UiIcon name="checkCircle" :size="18" class="mx-auto mb-1" />
          {{ t('tasks.approve') }}
        </button>
        <button type="button" class="rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition" :class="verdict === 'REJECTED' ? 'border-red-500 bg-red-50 text-red-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'" @click="verdict = 'REJECTED'">
          <UiIcon name="xCircle" :size="18" class="mx-auto mb-1" />
          {{ t('tasks.reject') }}
        </button>
      </div>
      <UiFormField v-if="verdict === 'VERIFIED'" :label="t('tasks.awardedPoints')" :hint="t('tasks.pointsHint', { max: task.maxPoints })">
        <input v-model.number="points" type="number" min="0" :max="task.maxPoints" class="input tabular-nums" />
      </UiFormField>
      <UiFormField :label="t('tasks.reviewComment')">
        <textarea v-model="comment" rows="3" class="input" />
      </UiFormField>
    </div>
    <template #footer>
      <button type="button" class="btn-secondary" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button type="button" :class="verdict === 'VERIFIED' ? 'btn-primary' : 'btn-danger'" :disabled="pending" @click="submit">
        <UiSpinner v-if="pending" />
        {{ verdict === 'VERIFIED' ? t('tasks.approve') : t('tasks.reject') }}
      </button>
    </template>
  </UiModal>
</template>
