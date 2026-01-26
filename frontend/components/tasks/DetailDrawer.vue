<script setup lang="ts">
import type { Task, TaskStatus } from '~/types/api'

const props = defineProps<{ task: Task | null; canManage: boolean }>()
const emit = defineEmits<{ close: []; edit: [task: Task]; verify: [task: Task]; remove: [task: Task]; updated: [task: Task] }>()

const { t } = useI18n()
const api = useApi()
const auth = useAuthStore()
const files = useFiles()
const format = useFormat()
const { pending, run } = useAsyncAction()

const isAssignee = computed(() => props.task?.assigneeId === auth.user?.id)
const canStart = computed(() => isAssignee.value && props.task && ['ASSIGNED', 'REJECTED', 'IN_PROGRESS'].includes(props.task.status))
const canSubmit = computed(() => isAssignee.value && props.task && props.task.status !== 'VERIFIED')
const canVerify = computed(() => props.canManage && props.task && ['COMPLETED', 'PARTIALLY_COMPLETED'].includes(props.task.status))
const canEdit = computed(() => props.canManage && props.task && props.task.status !== 'VERIFIED')

const comment = ref('')
watch(
  () => props.task?.id,
  () => {
    comment.value = ''
  },
)

const submitStatus = async (status: TaskStatus) => {
  if (!props.task) return
  const result = await run(() => api.patch<Task>(`/tasks/${props.task?.id}/status`, { status, comment: comment.value.trim() || undefined }), { successKey: 'tasks.statusUpdated' })
  if (result) {
    comment.value = ''
    emit('updated', result)
  }
}

const isOverdue = computed(() => props.task?.dueDate && ['ASSIGNED', 'IN_PROGRESS', 'REJECTED'].includes(props.task.status) && props.task.dueDate < new Date().toISOString().slice(0, 10))
</script>

<template>
  <UiDrawer :open="task !== null" :title="task?.title ?? ''" :subtitle="task?.departmentName ?? ''" width="lg" @close="emit('close')">
    <div v-if="task" class="space-y-5">
      <div class="flex flex-wrap items-center gap-2">
        <UiBadge enum-name="TaskStatus" :value="task.status" size="sm" />
        <UiBadge enum-name="TaskPriority" :value="task.priority" size="sm" />
        <UiBadge enum-name="TaskType" :value="task.type" size="sm" />
        <UiBadge v-if="isOverdue" tone="red" :label="t('tasks.overdue')" size="sm" />
      </div>

      <div class="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
        <UiAvatar :file-id="task.assignee?.photoFileId" :name="task.assignee?.fullName" size="md" />
        <div class="min-w-0">
          <p class="text-[11px] uppercase tracking-wide text-slate-500">{{ t('tasks.assignee') }}</p>
          <p class="truncate text-sm font-medium text-slate-900">{{ task.assignee?.fullName ?? '—' }}</p>
          <p class="truncate text-xs text-slate-500">{{ task.assignee?.position ?? '' }}</p>
        </div>
      </div>

      <dl class="grid grid-cols-2 gap-3 text-sm">
        <div><dt class="text-xs text-slate-500">{{ t('tasks.dueDate') }}</dt><dd class="font-medium" :class="isOverdue ? 'text-red-600' : 'text-slate-800'">{{ format.date(task.dueDate) }}</dd></div>
        <div><dt class="text-xs text-slate-500">{{ t('tasks.maxPoints') }}</dt><dd class="font-medium text-slate-800">{{ task.maxPoints }}</dd></div>
        <div><dt class="text-xs text-slate-500">{{ t('tasks.awardedPoints') }}</dt><dd class="font-medium text-slate-800">{{ task.awardedPoints ?? '—' }}</dd></div>
        <div><dt class="text-xs text-slate-500">{{ t('common.createdAt') }}</dt><dd class="font-medium text-slate-800">{{ format.dateTime(task.createdAt) }}</dd></div>
        <div><dt class="text-xs text-slate-500">{{ t('tasks.submittedAt') }}</dt><dd class="font-medium text-slate-800">{{ format.dateTime(task.submittedAt) }}</dd></div>
        <div><dt class="text-xs text-slate-500">{{ t('tasks.verifiedAt') }}</dt><dd class="font-medium text-slate-800">{{ format.dateTime(task.verifiedAt) }}</dd></div>
      </dl>

      <div v-if="task.description">
        <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('common.description') }}</h4>
        <p class="whitespace-pre-wrap text-sm text-slate-700">{{ task.description }}</p>
      </div>

      <div v-if="task.attachmentFileIds.length">
        <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('common.attachments') }}</h4>
        <div class="flex flex-wrap gap-2">
          <a v-for="fileId in task.attachmentFileIds" :key="fileId" :href="files.contentUrl(fileId, true) ?? '#'" target="_blank" rel="noopener" class="btn-secondary btn-sm">
            <UiIcon name="paperclip" :size="14" />
            {{ t('common.open') }}
          </a>
        </div>
      </div>

      <div v-if="task.employeeComment" class="rounded-lg border border-sky-100 bg-sky-50/60 p-3">
        <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t('tasks.employeeComment') }}</p>
        <p class="text-sm text-slate-700">{{ task.employeeComment }}</p>
      </div>
      <div v-if="task.reviewComment" class="rounded-lg border border-amber-100 bg-amber-50/60 p-3">
        <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">{{ t('tasks.reviewComment') }}</p>
        <p class="text-sm text-slate-700">{{ task.reviewComment }}</p>
      </div>

      <div v-if="canSubmit" class="rounded-xl border border-slate-200 p-4">
        <h4 class="mb-2 text-sm font-semibold text-slate-900">{{ t('tasks.updateStatus') }}</h4>
        <textarea v-model="comment" rows="2" class="input mb-3" :placeholder="t('tasks.commentPlaceholder')" />
        <div class="flex flex-wrap gap-2">
          <button v-if="canStart && task.status !== 'IN_PROGRESS'" type="button" class="btn-secondary btn-sm" :disabled="pending" @click="submitStatus('IN_PROGRESS')">
            <UiIcon name="play" :size="14" />
            {{ t('tasks.start') }}
          </button>
          <button type="button" class="btn-primary btn-sm" :disabled="pending" @click="submitStatus('COMPLETED')">
            <UiIcon name="check" :size="14" />
            {{ t('tasks.markCompleted') }}
          </button>
          <button type="button" class="btn-secondary btn-sm" :disabled="pending" @click="submitStatus('PARTIALLY_COMPLETED')">
            {{ t('tasks.markPartiallyCompleted') }}
          </button>
        </div>
      </div>
    </div>
    <template v-if="task && (canEdit || canVerify)" #footer>
      <button v-if="canEdit" type="button" class="btn-ghost text-red-600 hover:bg-red-50" @click="emit('remove', task)">
        <UiIcon name="trash" :size="16" />
        {{ t('common.delete') }}
      </button>
      <button v-if="canEdit" type="button" class="btn-secondary" @click="emit('edit', task)">
        <UiIcon name="pencil" :size="16" />
        {{ t('common.edit') }}
      </button>
      <button v-if="canVerify" type="button" class="btn-primary" @click="emit('verify', task)">
        <UiIcon name="checkCircle" :size="16" />
        {{ t('tasks.verify') }}
      </button>
    </template>
  </UiDrawer>
</template>
