<script setup lang="ts">
import type { Announcement, Paginated } from '~/types/api'
import { toDateTimeInput } from '~/utils/dates'

definePageMeta({ title: 'nav.announcements' })

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

const filters = reactive({ departmentId: '', includeExpired: false })
const page = ref(1)
const limit = ref(12)
const data = ref<Paginated<Announcement>>({ items: [], total: 0, page: 1, limit: 12 })
const loading = ref(false)

const load = async () => {
  loading.value = true
  try {
    data.value = await api.get<Paginated<Announcement>>('/announcements', {
      page: page.value,
      limit: limit.value,
      departmentId: filters.departmentId || undefined,
      includeExpired: filters.includeExpired ? 'true' : undefined,
    })
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

const editorOpen = ref(false)
const editing = ref<Announcement | null>(null)
const form = reactive({ title: '', body: '', departmentId: '', isPinned: false, expiresAt: '' })

const openCreate = () => {
  editing.value = null
  Object.assign(form, { title: '', body: '', departmentId: auth.isHead ? manageableDepartments.value[0]?.id ?? '' : '', isPinned: false, expiresAt: '' })
  editorOpen.value = true
}

const openEdit = (announcement: Announcement) => {
  editing.value = announcement
  Object.assign(form, { title: announcement.title, body: announcement.body, departmentId: announcement.departmentId ?? '', isPinned: announcement.isPinned, expiresAt: toDateTimeInput(announcement.expiresAt) })
  editorOpen.value = true
}

const valid = computed(() => form.title.trim().length >= 3 && form.body.trim().length >= 3 && (!auth.isHead || Boolean(form.departmentId)))

const save = async () => {
  if (!valid.value) return
  const payload = {
    title: form.title.trim(),
    body: form.body.trim(),
    isPinned: form.isPinned,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
  }
  const result = editing.value
    ? await run(() => api.patch<Announcement>(`/announcements/${editing.value?.id}`, payload), { successKey: 'common.saved' })
    : await run(() => api.post<Announcement>('/announcements', { ...payload, departmentId: form.departmentId || undefined }), { successKey: 'announcements.created' })
  if (result) {
    editorOpen.value = false
    await load()
  }
}

const deleting = ref<Announcement | null>(null)
const confirmDelete = async () => {
  if (!deleting.value) return
  const result = await run(() => api.delete(`/announcements/${deleting.value?.id}`), { successKey: 'announcements.deleted' })
  if (result !== undefined) {
    deleting.value = null
    await load()
  }
}

const canManage = (announcement: Announcement) => auth.isHr || auth.isSuperadmin || announcement.createdBy === auth.user?.id || (auth.isHead && manageableDepartments.value.some((department) => department.id === announcement.departmentId))
const isExpired = (announcement: Announcement) => Boolean(announcement.expiresAt && new Date(announcement.expiresAt).getTime() < Date.now())
const expanded = ref<Set<string>>(new Set())
const toggle = (id: string) => {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}
</script>

<template>
  <div>
    <UiPageHeader :title="t('nav.announcements')" :subtitle="t('announcements.subtitle', { total: data.total })">
      <button v-if="canCreate" type="button" class="btn-primary" @click="openCreate">
        <UiIcon name="plus" :size="16" />
        {{ t('announcements.create') }}
      </button>
    </UiPageHeader>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <UiSelect v-model="filters.departmentId" :options="selectOptions" :placeholder="t('common.allDepartments')" size="sm" class="w-56" />
      <label class="flex items-center gap-2 text-xs text-slate-600">
        <input v-model="filters.includeExpired" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
        {{ t('announcements.includeExpired') }}
      </label>
    </div>

    <div v-if="loading && data.items.length === 0" class="space-y-3">
      <div v-for="index in 4" :key="index" class="card card-body space-y-2"><div class="skeleton h-5 w-64" /><div class="skeleton h-4 w-full" /><div class="skeleton h-4 w-3/4" /></div>
    </div>
    <UiEmptyState v-else-if="data.items.length === 0" :title="t('announcements.empty')" icon="megaphone" />
    <div v-else class="space-y-3">
      <article v-for="announcement in data.items" :key="announcement.id" class="card card-body transition" :class="[announcement.isPinned ? 'border-brand/40 bg-brand/[0.03]' : '', isExpired(announcement) ? 'opacity-60' : '']">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <UiIcon v-if="announcement.isPinned" name="bookmark" :size="16" class="text-brand" />
              <h3 class="text-base font-semibold text-slate-900">{{ announcement.title }}</h3>
              <UiBadge :label="announcement.departmentName ?? t('announcements.organizationWide')" :tone="announcement.departmentId ? 'sky' : 'brand'" :dot="false" />
              <UiBadge v-if="isExpired(announcement)" tone="slate" :label="t('announcements.expired')" />
            </div>
            <p class="mt-1 text-xs text-slate-500">
              {{ format.dateTime(announcement.createdAt) }}
              <span v-if="announcement.expiresAt"> · {{ t('announcements.expiresAt') }}: {{ format.dateTime(announcement.expiresAt) }}</span>
            </p>
          </div>
          <div v-if="canManage(announcement)" class="flex items-center gap-1">
            <button type="button" class="btn-icon" :title="t('common.edit')" @click="openEdit(announcement)"><UiIcon name="pencil" :size="16" /></button>
            <button type="button" class="btn-icon text-red-500" :title="t('common.delete')" @click="deleting = announcement"><UiIcon name="trash" :size="16" /></button>
          </div>
        </div>
        <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700" :class="expanded.has(announcement.id) ? '' : 'line-clamp-4'">{{ announcement.body }}</p>
        <button v-if="announcement.body.length > 300" type="button" class="mt-2 text-xs font-medium text-brand hover:underline" @click="toggle(announcement.id)">
          {{ expanded.has(announcement.id) ? t('common.showLess') : t('common.showMore') }}
        </button>
      </article>
      <div v-if="pageCount > 1" class="flex items-center justify-center gap-2 pt-2">
        <button type="button" class="btn-secondary btn-sm" :disabled="page <= 1" @click="page -= 1"><UiIcon name="chevronLeft" :size="14" /></button>
        <span class="text-xs text-slate-600 tabular-nums">{{ page }} / {{ pageCount }}</span>
        <button type="button" class="btn-secondary btn-sm" :disabled="page >= pageCount" @click="page += 1"><UiIcon name="chevronRight" :size="14" /></button>
      </div>
    </div>

    <UiModal :open="editorOpen" :title="editing ? t('announcements.edit') : t('announcements.create')" size="lg" @close="editorOpen = false">
      <div class="space-y-4">
        <UiFormField :label="t('common.title')" required>
          <input v-model="form.title" type="text" class="input" maxlength="255" />
        </UiFormField>
        <UiFormField :label="t('announcements.body')" required>
          <textarea v-model="form.body" rows="8" class="input" />
        </UiFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UiFormField :label="t('departments.department')" :required="auth.isHead" :hint="auth.isHead ? '' : t('announcements.departmentHint')">
            <UiSelect v-model="form.departmentId" :options="manageableOptions" :disabled="Boolean(editing)" :clearable="!auth.isHead" :placeholder="auth.isHead ? t('common.select') : t('announcements.organizationWide')" />
          </UiFormField>
          <UiFormField :label="t('announcements.expiresAt')">
            <input v-model="form.expiresAt" type="datetime-local" class="input" />
          </UiFormField>
        </div>
        <label class="flex items-center gap-2 text-sm text-slate-700">
          <input v-model="form.isPinned" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
          {{ t('announcements.pinned') }}
        </label>
      </div>
      <template #footer>
        <button type="button" class="btn-secondary" @click="editorOpen = false">{{ t('common.cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="!valid || pending" @click="save">
          <UiSpinner v-if="pending" />
          {{ editing ? t('common.save') : t('announcements.publish') }}
        </button>
      </template>
    </UiModal>

    <UiConfirmDialog :open="deleting !== null" :title="t('announcements.deleteTitle')" :message="deleting?.title ?? ''" :confirm-label="t('common.delete')" danger :pending="pending" @confirm="confirmDelete" @cancel="deleting = null" />
  </div>
</template>
