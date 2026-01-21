<script setup lang="ts">
import type { AttendanceRecord, AttendanceStatus, TodaySheet } from '~/types/api'
import { ATTENDANCE_STATUSES, TONE_CLASSES, toneFor } from '~/utils/enums'

interface RowDraft {
  userId: string
  status: AttendanceStatus | null
  checkIn: string
  checkOut: string
  note: string
  dirty: boolean
  saving: boolean
}

const props = defineProps<{ departmentId: string }>()

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const format = useFormat()
const enumLabel = useEnumLabel()

const sheet = ref<TodaySheet | null>(null)
const loading = ref(false)
const drafts = ref<Record<string, RowDraft>>({})
const savingAll = ref(false)

const buildDraft = (userId: string, record: AttendanceRecord | null): RowDraft => ({
  userId,
  status: record?.status ?? null,
  checkIn: record?.checkIn ?? '',
  checkOut: record?.checkOut ?? '',
  note: record?.note ?? '',
  dirty: false,
  saving: false,
})

const load = async () => {
  loading.value = true
  try {
    sheet.value = await api.get<TodaySheet>(`/attendance/today/${props.departmentId}`)
    drafts.value = Object.fromEntries(sheet.value.members.map((member) => [member.userId, buildDraft(member.userId, member.attendance)]))
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}

watch(() => props.departmentId, load, { immediate: true })

const setStatus = (userId: string, status: AttendanceStatus) => {
  const draft = drafts.value[userId]
  if (!draft) return
  draft.status = status
  draft.dirty = true
}

const markDirty = (userId: string) => {
  const draft = drafts.value[userId]
  if (draft) draft.dirty = true
}

const payloadFor = (draft: RowDraft) => ({
  userId: draft.userId,
  departmentId: props.departmentId,
  status: draft.status,
  checkIn: draft.checkIn || undefined,
  checkOut: draft.checkOut || undefined,
  note: draft.note.trim() || undefined,
})

const applySaved = (record: AttendanceRecord) => {
  const member = sheet.value?.members.find((item) => item.userId === record.userId)
  if (member) member.attendance = record
  drafts.value[record.userId] = buildDraft(record.userId, record)
}

const saveOne = async (userId: string) => {
  const draft = drafts.value[userId]
  if (!draft || !draft.status) return
  draft.saving = true
  try {
    const record = await api.post<AttendanceRecord>('/attendance', payloadFor(draft))
    applySaved(record)
    ui.success('attendance.saved')
  } catch (error) {
    ui.toastError(error)
    draft.saving = false
  }
}

const dirtyDrafts = computed(() => Object.values(drafts.value).filter((draft) => draft.dirty && draft.status))

const saveAll = async () => {
  if (dirtyDrafts.value.length === 0) return
  savingAll.value = true
  try {
    const records = await api.post<AttendanceRecord[]>('/attendance/bulk', { records: dirtyDrafts.value.map(payloadFor) })
    records.forEach(applySaved)
    ui.success('attendance.savedAll')
  } catch (error) {
    ui.toastError(error)
  } finally {
    savingAll.value = false
  }
}

const markAllAs = (status: AttendanceStatus) => {
  for (const member of sheet.value?.members ?? []) {
    const draft = drafts.value[member.userId]
    if (draft && !draft.status) {
      draft.status = status
      draft.dirty = true
    }
  }
}

const markedCount = computed(() => (sheet.value?.members ?? []).filter((member) => member.attendance).length)

const statusButtonClass = (status: AttendanceStatus, active: boolean) =>
  active ? `${TONE_CLASSES[toneFor('AttendanceStatus', status)]} ring-2` : 'bg-white text-slate-500 ring-slate-200 hover:bg-slate-50'
</script>

<template>
  <div class="card">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
      <div>
        <h3 class="text-sm font-semibold text-slate-900">{{ t('attendance.todaySheet') }} · {{ format.date(sheet?.date) }}</h3>
        <p class="text-xs text-slate-500">
          {{ t('attendance.onlyTodayEditable') }}
          <span v-if="sheet && !sheet.isWorkingDay" class="ml-1 font-medium text-amber-700">{{ t('attendance.nonWorkingDay') }}</span>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-xs text-slate-500">{{ t('attendance.markedOf', { marked: markedCount, total: sheet?.members.length ?? 0 }) }}</span>
        <button type="button" class="btn-secondary btn-sm" :disabled="!sheet" @click="markAllAs('PRESENT')">
          <UiIcon name="checkCircle" :size="14" />
          {{ t('attendance.markRemainingPresent') }}
        </button>
        <button type="button" class="btn-primary btn-sm" :disabled="dirtyDrafts.length === 0 || savingAll" @click="saveAll">
          <UiSpinner v-if="savingAll" :size="14" />
          <UiIcon v-else name="check" :size="14" />
          {{ t('attendance.saveAll', { count: dirtyDrafts.length }) }}
        </button>
      </div>
    </div>

    <div v-if="loading && !sheet" class="space-y-3 p-5">
      <div v-for="index in 5" :key="index" class="skeleton h-12" />
    </div>

    <UiEmptyState v-else-if="!sheet || sheet.members.length === 0" :title="t('departments.noMembers')" icon="users" />

    <div v-else class="divide-y divide-slate-100">
      <div v-for="member in sheet.members" :key="member.userId" class="grid gap-3 px-5 py-3 lg:grid-cols-[minmax(200px,1.2fr)_auto_minmax(200px,1fr)_auto] lg:items-center">
        <div class="flex items-center gap-3">
          <UiAvatar :file-id="member.photoFileId" :name="member.fullName" size="sm" />
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-slate-900">{{ member.fullName }}</p>
            <p class="truncate text-xs text-slate-500">{{ member.position || '—' }} · {{ member.rate }}%</p>
          </div>
          <UiBadge v-if="member.employeeStatus !== 'ACTIVE'" enum-name="EmployeeStatus" :value="member.employeeStatus" />
        </div>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="status in ATTENDANCE_STATUSES"
            :key="status"
            type="button"
            class="rounded-md px-2 py-1 text-[11px] font-medium ring-1 ring-inset transition"
            :class="statusButtonClass(status, drafts[member.userId]?.status === status)"
            @click="setStatus(member.userId, status)"
          >
            {{ enumLabel('AttendanceStatus', status) }}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <input v-model="drafts[member.userId].checkIn" type="time" class="input w-28 py-1 text-xs" :title="t('attendance.checkIn')" @input="markDirty(member.userId)" />
          <input v-model="drafts[member.userId].checkOut" type="time" class="input w-28 py-1 text-xs" :title="t('attendance.checkOut')" @input="markDirty(member.userId)" />
          <input v-model="drafts[member.userId].note" type="text" class="input min-w-0 flex-1 py-1 text-xs" :placeholder="t('common.note')" @input="markDirty(member.userId)" />
        </div>
        <div class="flex items-center justify-end gap-2">
          <UiBadge v-if="member.attendance && !drafts[member.userId]?.dirty" enum-name="AttendanceStatus" :value="member.attendance.status" />
          <button type="button" class="btn-secondary btn-sm" :disabled="!drafts[member.userId]?.dirty || !drafts[member.userId]?.status || drafts[member.userId]?.saving" @click="saveOne(member.userId)">
            <UiSpinner v-if="drafts[member.userId]?.saving" :size="12" />
            {{ t('common.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
