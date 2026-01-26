<script setup lang="ts">
import type { Task, TaskStatus } from '~/types/api'
import { TASK_STATUSES, TONE_DOT_CLASSES, toneFor } from '~/utils/enums'

const props = defineProps<{ tasks: Task[]; loading: boolean }>()
const emit = defineEmits<{ open: [task: Task]; status: [task: Task, status: TaskStatus] }>()

const { t } = useI18n()
const format = useFormat()
const enumLabel = useEnumLabel()

const today = new Date().toISOString().slice(0, 10)

const columns = computed(() => TASK_STATUSES.map((status) => ({ status, tasks: props.tasks.filter((task) => task.status === status) })))

const isOverdue = (task: Task) => Boolean(task.dueDate && task.dueDate < today && ['ASSIGNED', 'IN_PROGRESS', 'REJECTED'].includes(task.status))
</script>

<template>
  <div class="flex gap-4 overflow-x-auto pb-2">
    <div v-for="column in columns" :key="column.status" class="w-72 shrink-0">
      <div class="mb-2 flex items-center justify-between px-1">
        <span class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span class="h-2 w-2 rounded-full" :class="TONE_DOT_CLASSES[toneFor('TaskStatus', column.status)]" />
          {{ enumLabel('TaskStatus', column.status) }}
        </span>
        <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{{ column.tasks.length }}</span>
      </div>
      <div class="min-h-[120px] space-y-2 rounded-xl bg-slate-100/70 p-2">
        <template v-if="loading && tasks.length === 0">
          <div v-for="index in 2" :key="index" class="skeleton h-20 bg-white" />
        </template>
        <div v-for="task in column.tasks" :key="task.id" class="card cursor-pointer p-3 transition hover:border-brand/40 hover:shadow-md" @click="emit('open', task)">
          <div class="flex items-start justify-between gap-2">
            <p class="line-clamp-2 text-sm font-medium text-slate-900">{{ task.title }}</p>
            <UiBadge enum-name="TaskPriority" :value="task.priority" :dot="false" />
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
            <UiBadge v-if="task.type === 'BONUS'" enum-name="TaskType" :value="task.type" :dot="false" />
            <span v-if="task.dueDate" :class="isOverdue(task) ? 'font-semibold text-red-600' : ''">{{ format.date(task.dueDate) }}</span>
            <span>· {{ task.awardedPoints ?? task.maxPoints }} {{ t('kpi.pointsShort') }}</span>
          </div>
          <div v-if="column.status === 'ASSIGNED' || column.status === 'REJECTED'" class="mt-2 flex gap-1.5" @click.stop>
            <button type="button" class="btn-secondary btn-sm flex-1" @click="emit('status', task, 'IN_PROGRESS')">
              <UiIcon name="play" :size="12" />
              {{ t('tasks.start') }}
            </button>
          </div>
          <div v-else-if="column.status === 'IN_PROGRESS'" class="mt-2 flex gap-1.5" @click.stop>
            <button type="button" class="btn-primary btn-sm flex-1" @click="emit('status', task, 'COMPLETED')">
              <UiIcon name="check" :size="12" />
              {{ t('tasks.done') }}
            </button>
            <button type="button" class="btn-secondary btn-sm" :title="t('tasks.markPartiallyCompleted')" @click="emit('open', task)">
              {{ t('tasks.partial') }}
            </button>
          </div>
        </div>
        <p v-if="!loading && column.tasks.length === 0" class="py-6 text-center text-xs text-slate-400">{{ t('common.empty') }}</p>
      </div>
    </div>
  </div>
</template>
