<script setup lang="ts">
import type { Paginated, Poll } from '~/types/api'

definePageMeta({ title: 'nav.polls' })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const auth = useAuthStore()
const format = useFormat()
const { departments, selectOptions } = useDepartments()
const { pending, run } = useAsyncAction()

const canCreate = computed(() => auth.isHead || auth.isHr || auth.isSuperadmin)
const manageableDepartments = computed(() => (auth.isHead ? departments.value.filter((department) => department.headUserId === auth.user?.id) : departments.value))
const manageableOptions = computed(() => manageableDepartments.value.map((department) => ({ value: department.id, label: `${department.name} (${department.code})` })))

const filters = reactive({ departmentId: '', activeOnly: true })
const page = ref(1)
const limit = ref(12)
const data = ref<Paginated<Poll>>({ items: [], total: 0, page: 1, limit: 12 })
const loading = ref(false)

const load = async () => {
  loading.value = true
  try {
    data.value = await api.get<Paginated<Poll>>('/polls', { page: page.value, limit: limit.value, departmentId: filters.departmentId || undefined, activeOnly: filters.activeOnly ? 'true' : undefined })
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}
watch(
  filters,
  () => {
    page.value = 1
    void load()
  },
  { deep: true },
)
watch(page, load)
onMounted(load)

const pageCount = computed(() => Math.max(1, Math.ceil(data.value.total / limit.value)))
const replace = (poll: Poll) => {
  data.value.items = data.value.items.map((item) => (item.id === poll.id ? poll : item))
}

const voting = ref<string | null>(null)
const vote = async (poll: Poll, optionIndex: number) => {
  if (poll.isClosed || poll.myVote !== null) return
  voting.value = poll.id
  try {
    replace(await api.post<Poll>(`/polls/${poll.id}/vote`, { optionIndex }))
    ui.success('polls.voted')
  } catch (error) {
    ui.toastError(error)
  } finally {
    voting.value = null
  }
}

const canManage = (poll: Poll) => auth.isHr || auth.isSuperadmin || poll.createdBy === auth.user?.id || (auth.isHead && manageableDepartments.value.some((department) => department.id === poll.departmentId))
const closePoll = async (poll: Poll) => {
  const result = await run(() => api.patch<Poll>(`/polls/${poll.id}/close`), { successKey: 'polls.closed' })
  if (result) replace(result)
}
const deleting = ref<Poll | null>(null)
const confirmDelete = async () => {
  if (!deleting.value) return
  const result = await run(() => api.delete(`/polls/${deleting.value?.id}`), { successKey: 'polls.deleted' })
  if (result !== undefined) {
    deleting.value = null
    await load()
  }
}

const percent = (poll: Poll, votes: number | null) => (votes === null || poll.totalVotes === 0 ? 0 : Math.round((votes / poll.totalVotes) * 100))
const departmentName = (id: string | null) => departments.value.find((department) => department.id === id)?.name ?? null

const createOpen = ref(false)
const form = reactive({ title: '', description: '', departmentId: '', isAnonymous: false, closesAt: '', options: ['', ''] })
const openCreate = () => {
  Object.assign(form, { title: '', description: '', departmentId: auth.isHead ? manageableDepartments.value[0]?.id ?? '' : '', isAnonymous: false, closesAt: '', options: ['', ''] })
  createOpen.value = true
}
const addOption = () => {
  if (form.options.length < 20) form.options.push('')
}
const removeOption = (index: number) => {
  if (form.options.length > 2) form.options.splice(index, 1)
}
const valid = computed(() => form.title.trim().length >= 3 && form.options.filter((option) => option.trim()).length >= 2 && form.options.every((option) => option.trim().length <= 200) && (!auth.isHead || Boolean(form.departmentId)))
const create = async () => {
  if (!valid.value) return
  const result = await run(
    () =>
      api.post<Poll>('/polls', {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        options: form.options.map((option) => option.trim()).filter(Boolean),
        departmentId: form.departmentId || undefined,
        isAnonymous: form.isAnonymous,
        closesAt: form.closesAt ? new Date(form.closesAt).toISOString() : undefined,
      }),
    { successKey: 'polls.created' },
  )
  if (result) {
    createOpen.value = false
    await load()
  }
}
</script>

<template>
  <div>
    <UiPageHeader :title="t('nav.polls')" :subtitle="t('polls.subtitle', { total: data.total })">
      <button v-if="canCreate" type="button" class="btn-primary" @click="openCreate">
        <UiIcon name="plus" :size="16" />
        {{ t('polls.create') }}
      </button>
    </UiPageHeader>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <UiSelect v-model="filters.departmentId" :options="selectOptions" :placeholder="t('common.allDepartments')" size="sm" class="w-56" />
      <label class="flex items-center gap-2 text-xs text-slate-600">
        <input v-model="filters.activeOnly" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
        {{ t('polls.activeOnly') }}
      </label>
    </div>

    <div v-if="loading && data.items.length === 0" class="grid gap-4 lg:grid-cols-2">
      <div v-for="index in 4" :key="index" class="card card-body space-y-3"><div class="skeleton h-5 w-56" /><div class="skeleton h-8 w-full" /><div class="skeleton h-8 w-full" /></div>
    </div>
    <UiEmptyState v-else-if="data.items.length === 0" :title="t('polls.empty')" icon="pie" />
    <div v-else class="grid gap-4 lg:grid-cols-2">
      <article v-for="poll in data.items" :key="poll.id" class="card card-body flex flex-col">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-base font-semibold text-slate-900">{{ poll.title }}</h3>
              <UiBadge :tone="poll.isClosed ? 'slate' : 'green'" :label="poll.isClosed ? t('polls.closedLabel') : t('polls.active')" />
              <UiBadge v-if="poll.isAnonymous" tone="violet" :label="t('polls.anonymous')" :dot="false" />
            </div>
            <p class="mt-1 text-xs text-slate-500">
              {{ poll.createdByName }} · {{ format.dateTime(poll.createdAt) }} · {{ departmentName(poll.departmentId) ?? t('announcements.organizationWide') }}
              <span v-if="poll.closesAt"> · {{ t('polls.closesAt') }}: {{ format.dateTime(poll.closesAt) }}</span>
            </p>
          </div>
          <div v-if="canManage(poll)" class="flex items-center gap-1">
            <button v-if="!poll.isClosed" type="button" class="btn-icon" :title="t('polls.close')" :disabled="pending" @click="closePoll(poll)"><UiIcon name="lock" :size="16" /></button>
            <button type="button" class="btn-icon text-red-500" :title="t('common.delete')" @click="deleting = poll"><UiIcon name="trash" :size="16" /></button>
          </div>
        </div>
        <p v-if="poll.description" class="mt-2 text-sm text-slate-600">{{ poll.description }}</p>

        <div class="mt-4 flex-1 space-y-2">
          <button
            v-for="option in poll.options"
            :key="option.index"
            type="button"
            class="relative w-full overflow-hidden rounded-lg border px-3 py-2.5 text-left text-sm transition"
            :class="[
              poll.myVote === option.index ? 'border-brand bg-brand/5 font-medium text-slate-900' : 'border-slate-200 text-slate-700',
              poll.isClosed || poll.myVote !== null ? 'cursor-default' : 'hover:border-brand/50 hover:bg-slate-50',
            ]"
            :disabled="poll.isClosed || poll.myVote !== null || voting === poll.id"
            @click="vote(poll, option.index)"
          >
            <span v-if="option.votes !== null" class="absolute inset-y-0 left-0 bg-brand/10 transition-all duration-500" :style="{ width: `${percent(poll, option.votes)}%` }" />
            <span class="relative flex items-center justify-between gap-3">
              <span class="flex items-center gap-2">
                <UiIcon v-if="poll.myVote === option.index" name="checkCircle" :size="16" class="text-brand" />
                {{ option.label }}
              </span>
              <span v-if="option.votes !== null" class="shrink-0 text-xs tabular-nums text-slate-600">{{ option.votes }} · {{ percent(poll, option.votes) }}%</span>
            </span>
          </button>
        </div>
        <p class="mt-3 text-xs text-slate-500">
          {{ t('polls.totalVotes', { count: poll.totalVotes }) }}
          <span v-if="poll.myVote === null && !poll.isClosed"> · {{ t('polls.pickOption') }}</span>
          <span v-else-if="poll.myVote !== null"> · {{ t('polls.youVoted') }}</span>
        </p>
      </article>
    </div>
    <div v-if="pageCount > 1" class="mt-4 flex items-center justify-center gap-2">
      <button type="button" class="btn-secondary btn-sm" :disabled="page <= 1" @click="page -= 1"><UiIcon name="chevronLeft" :size="14" /></button>
      <span class="text-xs text-slate-600 tabular-nums">{{ page }} / {{ pageCount }}</span>
      <button type="button" class="btn-secondary btn-sm" :disabled="page >= pageCount" @click="page += 1"><UiIcon name="chevronRight" :size="14" /></button>
    </div>

    <UiModal :open="createOpen" :title="t('polls.create')" size="lg" @close="createOpen = false">
      <div class="space-y-4">
        <UiFormField :label="t('common.title')" required>
          <input v-model="form.title" type="text" class="input" maxlength="255" />
        </UiFormField>
        <UiFormField :label="t('common.description')">
          <textarea v-model="form.description" rows="3" class="input" />
        </UiFormField>
        <UiFormField :label="t('polls.options')" required :hint="t('polls.optionsHint')">
          <div class="space-y-2">
            <div v-for="(option, index) in form.options" :key="index" class="flex items-center gap-2">
              <span class="w-6 text-center text-xs text-slate-400">{{ index + 1 }}</span>
              <input v-model="form.options[index]" type="text" class="input" maxlength="200" />
              <button type="button" class="btn-icon text-red-500" :disabled="form.options.length <= 2" @click="removeOption(index)"><UiIcon name="trash" :size="14" /></button>
            </div>
            <button type="button" class="btn-secondary btn-sm" :disabled="form.options.length >= 20" @click="addOption">
              <UiIcon name="plus" :size="14" />
              {{ t('polls.addOption') }}
            </button>
          </div>
        </UiFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UiFormField :label="t('departments.department')" :required="auth.isHead" :hint="auth.isHead ? '' : t('announcements.departmentHint')">
            <UiSelect v-model="form.departmentId" :options="manageableOptions" :clearable="!auth.isHead" :placeholder="auth.isHead ? t('common.select') : t('announcements.organizationWide')" />
          </UiFormField>
          <UiFormField :label="t('polls.closesAt')">
            <input v-model="form.closesAt" type="datetime-local" class="input" />
          </UiFormField>
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input v-model="form.isAnonymous" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
          {{ t('polls.anonymousHint') }}
        </label>
      </div>
      <template #footer>
        <button type="button" class="btn-secondary" @click="createOpen = false">{{ t('common.cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="!valid || pending" @click="create">
          <UiSpinner v-if="pending" />
          {{ t('polls.publish') }}
        </button>
      </template>
    </UiModal>

    <UiConfirmDialog :open="deleting !== null" :title="t('polls.deleteTitle')" :message="deleting?.title ?? ''" :confirm-label="t('common.delete')" danger :pending="pending" @confirm="confirmDelete" @cancel="deleting = null" />
  </div>
</template>
