<script setup lang="ts">
import type { Department, DepartmentDetail } from '~/types/api'

definePageMeta({ title: 'nav.departments' })

const { t } = useI18n()
const api = useApi()
const auth = useAuthStore()
const router = useRouter()
const { departments, loading, load } = useDepartments({ includeInactive: true })
const { pending, run } = useAsyncAction()

const canManage = computed(() => auth.isHr || auth.isSuperadmin)
const search = ref('')
const showInactive = ref(false)

const filtered = computed(() =>
  departments.value.filter((department) => {
    if (!showInactive.value && !department.isActive) return false
    const needle = search.value.trim().toLowerCase()
    if (!needle) return true
    return department.name.toLowerCase().includes(needle) || department.code.toLowerCase().includes(needle) || (department.head?.fullName ?? '').toLowerCase().includes(needle)
  }),
)

const editorOpen = ref(false)
const editing = ref<Department | null>(null)
const form = reactive({ name: '', code: '', description: '', isActive: true })

const openCreate = () => {
  editing.value = null
  Object.assign(form, { name: '', code: '', description: '', isActive: true })
  editorOpen.value = true
}

const openEdit = (department: Department) => {
  editing.value = department
  Object.assign(form, { name: department.name, code: department.code, description: department.description ?? '', isActive: department.isActive })
  editorOpen.value = true
}

const codeError = computed(() => (form.code && !/^[A-Z0-9_-]{2,32}$/.test(form.code) ? t('validation.departmentCode') : ''))
const valid = computed(() => form.name.trim().length >= 2 && form.code.length >= 2 && !codeError.value)

const save = async () => {
  if (!valid.value) return
  const payload = { name: form.name.trim(), code: form.code.trim().toUpperCase(), description: form.description.trim() || undefined }
  const result = editing.value
    ? await run(() => api.patch<DepartmentDetail>(`/departments/${editing.value?.id}`, { ...payload, isActive: form.isActive }), { successKey: 'common.saved' })
    : await run(() => api.post<DepartmentDetail>('/departments', payload), { successKey: 'departments.created' })
  if (result) {
    editorOpen.value = false
    await load()
  }
}

const headOpen = ref(false)
const headTarget = ref<Department | null>(null)
const headUserId = ref<string | null>(null)

const openHead = (department: Department) => {
  headTarget.value = department
  headUserId.value = department.headUserId
  headOpen.value = true
}

const saveHead = async () => {
  if (!headTarget.value) return
  const result = await run(() => api.put<DepartmentDetail>(`/departments/${headTarget.value?.id}/head`, { userId: headUserId.value ?? null }), { successKey: 'departments.headUpdated' })
  if (result) {
    headOpen.value = false
    await load()
  }
}
</script>

<template>
  <div>
    <UiPageHeader :title="t('nav.departments')" :subtitle="t('departments.subtitle', { count: departments.filter((item) => item.isActive).length })">
      <button v-if="canManage" type="button" class="btn-primary" @click="openCreate">
        <UiIcon name="plus" :size="16" />
        {{ t('departments.create') }}
      </button>
    </UiPageHeader>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="relative">
        <UiIcon name="search" :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input v-model="search" type="search" class="input w-64 pl-9 py-1.5 text-xs" :placeholder="t('common.search')" />
      </div>
      <label v-if="canManage" class="flex items-center gap-2 text-xs text-slate-600">
        <input v-model="showInactive" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
        {{ t('departments.showInactive') }}
      </label>
    </div>

    <div v-if="loading && departments.length === 0" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="index in 6" :key="index" class="card card-body space-y-3">
        <div class="skeleton h-5 w-40" />
        <div class="skeleton h-4 w-24" />
        <div class="skeleton h-10 w-full" />
      </div>
    </div>

    <UiEmptyState v-else-if="filtered.length === 0" :title="t('departments.empty')" icon="building" />

    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="department in filtered" :key="department.id" class="card flex flex-col transition hover:border-brand/40 hover:shadow-md" :class="department.isActive ? '' : 'opacity-70'">
        <div class="flex-1 cursor-pointer p-5" @click="router.push(`/departments/${department.id}`)">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h3 class="truncate text-base font-semibold text-slate-900">{{ department.name }}</h3>
              <p class="font-mono text-xs text-slate-500">{{ department.code }}</p>
            </div>
            <UiBadge v-if="!department.isActive" tone="slate" :label="t('common.inactive')" />
          </div>
          <p v-if="department.description" class="mt-2 line-clamp-2 text-sm text-slate-600">{{ department.description }}</p>
          <div class="mt-4 flex items-center gap-3">
            <UiAvatar :file-id="department.head?.photoFileId" :name="department.head?.fullName ?? '?'" size="sm" />
            <div class="min-w-0">
              <p class="text-[11px] uppercase tracking-wide text-slate-500">{{ t('departments.head') }}</p>
              <p class="truncate text-sm font-medium text-slate-800">{{ department.head?.fullName ?? t('departments.noHead') }}</p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2 text-center">
            <div class="rounded-lg bg-slate-50 py-2">
              <p class="text-lg font-semibold tabular-nums text-slate-900">{{ department.memberCount }}</p>
              <p class="text-[11px] text-slate-500">{{ t('departments.members') }}</p>
            </div>
            <div class="rounded-lg bg-slate-50 py-2">
              <p class="text-lg font-semibold tabular-nums text-slate-900">{{ department.totalRate }}%</p>
              <p class="text-[11px] text-slate-500">{{ t('departments.totalRate') }}</p>
            </div>
          </div>
        </div>
        <div v-if="canManage" class="flex items-center justify-end gap-1 border-t border-slate-100 px-3 py-2">
          <button type="button" class="btn-ghost btn-sm" @click="openHead(department)">
            <UiIcon name="user" :size="14" />
            {{ t('departments.setHead') }}
          </button>
          <button type="button" class="btn-ghost btn-sm" @click="openEdit(department)">
            <UiIcon name="pencil" :size="14" />
            {{ t('common.edit') }}
          </button>
        </div>
      </div>
    </div>

    <UiModal :open="editorOpen" :title="editing ? t('departments.edit') : t('departments.create')" @close="editorOpen = false">
      <div class="space-y-4">
        <UiFormField :label="t('departments.name')" required>
          <input v-model="form.name" type="text" class="input" />
        </UiFormField>
        <UiFormField :label="t('departments.code')" required :error="codeError" :hint="t('departments.codeHint')">
          <input v-model="form.code" type="text" class="input font-mono uppercase" maxlength="32" @input="form.code = form.code.toUpperCase()" />
        </UiFormField>
        <UiFormField :label="t('common.description')">
          <textarea v-model="form.description" rows="3" class="input" />
        </UiFormField>
        <label v-if="editing" class="flex items-center gap-2 text-sm text-slate-700">
          <input v-model="form.isActive" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
          {{ t('common.active') }}
        </label>
      </div>
      <template #footer>
        <button type="button" class="btn-secondary" @click="editorOpen = false">{{ t('common.cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="!valid || pending" @click="save">
          <UiSpinner v-if="pending" />
          {{ t('common.save') }}
        </button>
      </template>
    </UiModal>

    <UiModal :open="headOpen" :title="t('departments.setHead')" :subtitle="headTarget?.name" @close="headOpen = false">
      <div class="space-y-3">
        <p class="text-xs text-slate-500">{{ t('departments.setHeadHint') }}</p>
        <EmployeesSearch v-model="headUserId" :initial-label="headTarget?.head ? `${headTarget.head.fullName} (@${headTarget.head.login})` : ''" />
      </div>
      <template #footer>
        <button type="button" class="btn-secondary" @click="headOpen = false">{{ t('common.cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="pending" @click="saveHead">
          <UiSpinner v-if="pending" />
          {{ headUserId ? t('common.save') : t('departments.removeHead') }}
        </button>
      </template>
    </UiModal>
  </div>
</template>
