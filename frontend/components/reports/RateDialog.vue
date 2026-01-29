<script setup lang="ts">
import type { DailyReport } from '~/types/api'

const props = defineProps<{ open: boolean; report: DailyReport | null }>()
const emit = defineEmits<{ close: []; saved: [report: DailyReport] }>()

const { t } = useI18n()
const api = useApi()
const format = useFormat()
const organization = useOrganizationStore()
const { pending, run } = useAsyncAction()

const rating = ref<number | null>(null)
const comment = ref('')

watch(
  () => props.open,
  (open) => {
    if (open) {
      rating.value = null
      comment.value = ''
    }
  },
)

const maxPoints = computed(() => organization.settings?.reportMaxPoints ?? 5)
const previewPoints = computed(() => (rating.value ? Math.round((rating.value / 5) * maxPoints.value) : 0))

const submit = async () => {
  if (!props.report || !rating.value) return
  const result = await run(() => api.post<DailyReport>(`/reports/daily/${props.report?.id}/rate`, { rating: rating.value, comment: comment.value.trim() || undefined }), { successKey: 'reports.rated' })
  if (result) emit('saved', result)
}
</script>

<template>
  <UiModal :open="open" :title="t('reports.rate')" :subtitle="report ? `${report.userFullName} · ${format.date(report.date)}` : ''" size="lg" @close="emit('close')">
    <div v-if="report" class="space-y-4">
      <div class="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{{ report.content }}</div>
      <p v-if="report.completedTaskIds.length" class="text-xs text-slate-500">{{ t('reports.linkedTasks', { count: report.completedTaskIds.length }) }}</p>
      <div class="flex flex-wrap items-center gap-4">
        <ReportsRatingStars v-model="rating" :size="28" />
        <span class="text-sm text-slate-600">{{ rating ? t('reports.willAward', { points: previewPoints }) : t('reports.pickRating') }}</span>
      </div>
      <UiFormField :label="t('common.comment')">
        <textarea v-model="comment" rows="3" class="input" />
      </UiFormField>
    </div>
    <template #footer>
      <button type="button" class="btn-secondary" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button type="button" class="btn-primary" :disabled="!rating || pending" @click="submit">
        <UiSpinner v-if="pending" />
        <UiIcon v-else name="star" :size="16" />
        {{ t('reports.rate') }}
      </button>
    </template>
  </UiModal>
</template>
