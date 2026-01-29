<script setup lang="ts">
import type { DailyReport, Paginated, Task } from '~/types/api'

const emit = defineEmits<{ saved: [report: DailyReport] }>()

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const format = useFormat()
const { pending, run } = useAsyncAction()

const report = ref<DailyReport | null>(null)
const loading = ref(true)
const content = ref('')
const completedTaskIds = ref<string[]>([])
const tasks = ref<Task[]>([])

const load = async () => {
  loading.value = true
  try {
    const [todayReport, taskList] = await Promise.all([
      api.get<DailyReport | null>('/reports/daily/today'),
      api.get<Paginated<Task>>('/tasks', { limit: 100, sortBy: 'createdAt', sortOrder: 'DESC' }),
    ])
    report.value = todayReport
    content.value = todayReport?.content ?? ''
    completedTaskIds.value = todayReport?.completedTaskIds ?? []
    tasks.value = taskList.items.filter((task) => task.status !== 'VERIFIED' || completedTaskIds.value.includes(task.id))
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const rated = computed(() => Boolean(report.value?.ratedAt))
const valid = computed(() => content.value.trim().length >= 10 && content.value.length <= 10000)

const toggleTask = (taskId: string) => {
  completedTaskIds.value = completedTaskIds.value.includes(taskId) ? completedTaskIds.value.filter((id) => id !== taskId) : [...completedTaskIds.value, taskId]
}

const submit = async () => {
  if (!valid.value || rated.value) return
  const result = await run(() => api.post<DailyReport>('/reports/daily', { content: content.value.trim(), completedTaskIds: completedTaskIds.value }), {
    successKey: report.value ? 'reports.updated' : 'reports.submitted',
  })
  if (result) {
    report.value = result
    emit('saved', result)
  }
}
</script>

<template>
  <div class="card">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">{{ t('reports.todayReport') }} · {{ format.date(new Date()) }}</h3>
        <p class="text-xs text-slate-500">{{ report ? t('reports.submittedAt', { time: format.dateTime(report.submittedAt) }) : t('reports.notSubmittedYet') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <template v-if="rated && report">
          <ReportsRatingStars :model-value="report.rating" read-only />
          <UiBadge tone="green" :label="`+${report.pointsAwarded} ${t('kpi.pointsShort')}`" :dot="false" />
        </template>
        <UiBadge v-else-if="report" tone="amber" :label="t('reports.awaitingRating')" />
        <UiBadge v-else tone="red" :label="t('reports.notSubmitted')" />
      </div>
    </div>
    <div v-if="loading" class="space-y-3 p-5">
      <div class="skeleton h-32" />
      <div class="skeleton h-10 w-1/2" />
    </div>
    <div v-else class="grid gap-5 p-5 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <UiFormField :label="t('reports.content')" required :hint="t('reports.contentHint', { n: content.trim().length })">
          <textarea v-model="content" rows="10" class="input" :disabled="rated" :placeholder="t('reports.contentPlaceholder')" />
        </UiFormField>
        <div v-if="rated && report?.ratingComment" class="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 p-3">
          <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">{{ t('reports.headComment') }}</p>
          <p class="text-sm text-slate-700">{{ report.ratingComment }}</p>
        </div>
      </div>
      <div>
        <p class="label">{{ t('reports.completedTasks') }}</p>
        <div v-if="tasks.length" class="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2">
          <label v-for="task in tasks" :key="task.id" class="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50" :class="rated ? 'cursor-default' : ''">
            <input type="checkbox" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" :checked="completedTaskIds.includes(task.id)" :disabled="rated" @change="toggleTask(task.id)" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-slate-800">{{ task.title }}</span>
              <UiBadge enum-name="TaskStatus" :value="task.status" class="mt-0.5" />
            </span>
          </label>
        </div>
        <p v-else class="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">{{ t('reports.noTasksToLink') }}</p>
      </div>
    </div>
    <div v-if="!loading && !rated" class="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
      <button type="button" class="btn-primary" :disabled="!valid || pending" @click="submit">
        <UiSpinner v-if="pending" />
        <UiIcon v-else name="check" :size="16" />
        {{ report ? t('reports.update') : t('reports.submit') }}
      </button>
    </div>
  </div>
</template>
