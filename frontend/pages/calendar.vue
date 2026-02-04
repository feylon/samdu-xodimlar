<script setup lang="ts">
import type { CalendarDayType, CalendarDayView } from '~/types/api'
import { CALENDAR_DAY_TYPES, TONE_DOT_CLASSES, toneFor } from '~/utils/enums'
import { currentPeriod, eachDate, weekdayMondayFirst } from '~/utils/dates'
import dayjs from 'dayjs'

definePageMeta({ title: 'nav.calendar' })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const auth = useAuthStore()
const format = useFormat()
const enumLabel = useEnumLabel()
const { pending, run } = useAsyncAction()

const canEdit = computed(() => auth.isHr || auth.isSuperadmin)
const period = ref(currentPeriod())
const days = ref<CalendarDayView[]>([])
const loading = ref(false)

const load = async () => {
  loading.value = true
  try {
    days.value = await api.get<CalendarDayView[]>('/calendar', { year: period.value.year, month: period.value.month })
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}
watch(period, load, { immediate: true, deep: true })

const weekdays = computed(() => [1, 2, 3, 4, 5, 6, 7].map((day) => t(`weekdaysShort.${day}`)))
const offset = computed(() => (days.value.length ? weekdayMondayFirst(days.value[0].date) : 0))
const today = dayjs().format('YYYY-MM-DD')

const CELL_CLASSES: Record<CalendarDayType, string> = {
  WORKING: 'bg-white border-slate-200 text-slate-800',
  WEEKEND: 'bg-slate-50 border-slate-200 text-slate-500',
  HOLIDAY: 'bg-red-50 border-red-200 text-red-800',
  NON_WORKING: 'bg-amber-50 border-amber-200 text-amber-800',
}

const stats = computed(() => CALENDAR_DAY_TYPES.map((type) => ({ type, count: days.value.filter((day) => day.type === type).length })))

const dayOpen = ref(false)
const editingDay = ref<CalendarDayView | null>(null)
const dayForm = reactive({ type: 'HOLIDAY' as CalendarDayType, title: '' })
const typeOptions = CALENDAR_DAY_TYPES.map((type) => ({ value: type, label: enumLabel('CalendarDayType', type) }))

const openDay = (day: CalendarDayView) => {
  if (!canEdit.value) return
  editingDay.value = day
  dayForm.type = day.isOverride ? day.type : day.type === 'WORKING' ? 'HOLIDAY' : 'WORKING'
  dayForm.title = day.title ?? ''
  dayOpen.value = true
}

const saveDay = async () => {
  if (!editingDay.value) return
  const result = await run(() => api.put<CalendarDayView>('/calendar/days', { date: editingDay.value?.date, type: dayForm.type, title: dayForm.title.trim() || undefined }), { successKey: 'common.saved' })
  if (result) {
    dayOpen.value = false
    await load()
  }
}

const resetDay = async () => {
  if (!editingDay.value) return
  const result = await run(() => api.delete(`/calendar/days/${editingDay.value?.date}`), { successKey: 'calendar.reset' })
  if (result !== undefined) {
    dayOpen.value = false
    await load()
  }
}

const bulkOpen = ref(false)
const bulkForm = reactive({ from: '', to: '', type: 'HOLIDAY' as CalendarDayType, title: '' })
const bulkCount = computed(() => (bulkForm.from && bulkForm.to && bulkForm.to >= bulkForm.from ? eachDate(bulkForm.from, bulkForm.to).length : 0))
const saveBulk = async () => {
  if (bulkCount.value === 0 || bulkCount.value > 366) return
  const payload = { days: eachDate(bulkForm.from, bulkForm.to).map((date) => ({ date, type: bulkForm.type, title: bulkForm.title.trim() || undefined })) }
  const result = await run(() => api.post('/calendar/days/bulk', payload), { successKey: 'calendar.bulkSaved' })
  if (result !== undefined) {
    bulkOpen.value = false
    await load()
  }
}
</script>

<template>
  <div>
    <UiPageHeader :title="t('nav.calendar')" :subtitle="canEdit ? t('calendar.editSubtitle') : t('calendar.subtitle')">
      <button v-if="canEdit" type="button" class="btn-secondary" @click="bulkOpen = true">
        <UiIcon name="calendar" :size="16" />
        {{ t('calendar.bulkMark') }}
      </button>
    </UiPageHeader>

    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <UiMonthPicker v-model="period" />
      <div class="flex flex-wrap gap-3">
        <span v-for="item in stats" :key="item.type" class="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <span class="h-2.5 w-2.5 rounded-sm" :class="TONE_DOT_CLASSES[toneFor('CalendarDayType', item.type)]" />
          {{ enumLabel('CalendarDayType', item.type) }}: <span class="font-semibold tabular-nums">{{ item.count }}</span>
        </span>
      </div>
    </div>

    <div class="card card-body">
      <div class="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span v-for="label in weekdays" :key="label" class="py-1">{{ label }}</span>
      </div>
      <div class="mt-1.5 grid grid-cols-7 gap-1.5">
        <div v-for="index in offset" :key="`pad-${index}`" />
        <button
          v-for="day in days"
          :key="day.date"
          type="button"
          class="relative min-h-[76px] rounded-lg border p-2 text-left transition"
          :class="[CELL_CLASSES[day.type], day.date === today ? 'ring-2 ring-brand/50' : '', canEdit ? 'hover:shadow-md hover:border-brand/50' : 'cursor-default']"
          :disabled="!canEdit"
          @click="openDay(day)"
        >
          <span class="text-sm font-semibold tabular-nums">{{ dayjs(day.date).date() }}</span>
          <span v-if="day.isOverride" class="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" :title="t('calendar.override')" />
          <p class="mt-1 text-[10px] font-medium uppercase tracking-wide opacity-70">{{ enumLabel('CalendarDayType', day.type) }}</p>
          <p v-if="day.title" class="mt-0.5 line-clamp-2 text-[11px] leading-tight">{{ day.title }}</p>
        </button>
      </div>
    </div>

    <UiModal :open="dayOpen" :title="editingDay ? format.date(editingDay.date) : ''" :subtitle="editingDay ? enumLabel('CalendarDayType', editingDay.type) : ''" size="sm" @close="dayOpen = false">
      <div class="space-y-4">
        <UiFormField :label="t('calendar.dayType')" required>
          <UiSelect v-model="dayForm.type" :options="typeOptions" :clearable="false" />
        </UiFormField>
        <UiFormField :label="t('calendar.title')">
          <input v-model="dayForm.title" type="text" class="input" maxlength="200" />
        </UiFormField>
      </div>
      <template #footer>
        <button v-if="editingDay?.isOverride" type="button" class="btn-ghost mr-auto text-red-600 hover:bg-red-50" :disabled="pending" @click="resetDay">
          <UiIcon name="refresh" :size="16" />
          {{ t('calendar.resetDefault') }}
        </button>
        <button type="button" class="btn-secondary" @click="dayOpen = false">{{ t('common.cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="pending" @click="saveDay">
          <UiSpinner v-if="pending" />
          {{ t('common.save') }}
        </button>
      </template>
    </UiModal>

    <UiModal :open="bulkOpen" :title="t('calendar.bulkMark')" :subtitle="t('calendar.bulkHint')" size="sm" @close="bulkOpen = false">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <UiFormField :label="t('common.from')" required>
            <input v-model="bulkForm.from" type="date" class="input" />
          </UiFormField>
          <UiFormField :label="t('common.to')" required>
            <input v-model="bulkForm.to" type="date" class="input" />
          </UiFormField>
        </div>
        <UiFormField :label="t('calendar.dayType')" required>
          <UiSelect v-model="bulkForm.type" :options="typeOptions" :clearable="false" />
        </UiFormField>
        <UiFormField :label="t('calendar.title')">
          <input v-model="bulkForm.title" type="text" class="input" maxlength="200" />
        </UiFormField>
        <p class="text-xs text-slate-500">{{ t('calendar.bulkCount', { count: bulkCount }) }}</p>
      </div>
      <template #footer>
        <button type="button" class="btn-secondary" @click="bulkOpen = false">{{ t('common.cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="bulkCount === 0 || bulkCount > 366 || pending" @click="saveBulk">
          <UiSpinner v-if="pending" />
          {{ t('common.save') }}
        </button>
      </template>
    </UiModal>
  </div>
</template>
