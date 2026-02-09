<script setup lang="ts">
import type { EmployeeDetail, Paginated, PublicUser } from '~/types/api'
import type { DataTableColumn } from '~/components/ui/DataTable.vue'
import type { PersonalFormModel } from '~/components/employees/PersonalForm.vue'
import { EMPLOYEE_STATUSES, USER_ROLES } from '~/utils/enums'

definePageMeta({ title: 'nav.users', middleware: 'role', roles: ['SUPERADMIN'] })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const format = useFormat()
const enumLabel = useEnumLabel()
const router = useRouter()
const { pending, run } = useAsyncAction()

const filters = reactive({ search: '', role: '', status: '' })
const page = ref(1)
const limit = ref(20)
const sortBy = ref('fullName')
const sortOrder = ref<'ASC' | 'DESC'>('ASC')
const data = ref<Paginated<PublicUser>>({ items: [], total: 0, page: 1, limit: 20 })
const loading = ref(false)
const debouncedSearch = useDebouncedRef(toRef(filters, 'search'), 400)

const load = async () => {
  loading.value = true
  try {
    data.value = await api.get<Paginated<PublicUser>>('/users', {
      search: debouncedSearch.value || undefined,
      role: filters.role || undefined,
      status: filters.status || undefined,
      page: page.value,
      limit: limit.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}
watch([debouncedSearch, () => filters.role, () => filters.status], () => {
  page.value = 1
  void load()
})
watch([page, limit, sortBy, sortOrder], load)
onMounted(load)

const roleOptions = USER_ROLES.map((role) => ({ value: role, label: enumLabel('UserRole', role) }))
const statusOptions = EMPLOYEE_STATUSES.map((status) => ({ value: status, label: enumLabel('EmployeeStatus', status) }))

const columns = computed<DataTableColumn<PublicUser>[]>(() => [
  { key: 'fullName', label: t('employees.fullName'), sortable: true },
  { key: 'login', label: t('auth.loginField'), sortable: true },
  { key: 'role', label: t('common.role'), format: (row) => enumLabel('UserRole', row.role) },
  { key: 'position', label: t('employees.position'), sortable: true },
  { key: 'status', label: t('common.status'), sortable: true, format: (row) => enumLabel('EmployeeStatus', row.status) },
  { key: 'mustChangePassword', label: t('users.mustChangePasswordShort'), type: 'boolean' },
  { key: 'lastLoginAt', label: t('employees.lastLogin'), type: 'datetime' },
  { key: 'createdAt', label: t('common.createdAt'), sortable: true, type: 'datetime' },
])

const onSort = (payload: { sortBy: string; sortOrder: 'ASC' | 'DESC' }) => {
  sortBy.value = payload.sortBy
  sortOrder.value = payload.sortOrder
}

const createOpen = ref(false)
const hrForm = reactive({ login: '', password: '', fullName: '', phone: '', email: '', position: '' })
const showPassword = ref(false)
const hrLoginError = computed(() => (hrForm.login && !/^[a-zA-Z0-9._-]{3,64}$/.test(hrForm.login) ? t('validation.login') : ''))
const hrValid = computed(() => !hrLoginError.value && hrForm.login.length >= 3 && hrForm.password.length >= 8 && hrForm.fullName.trim().length >= 3)
const generatePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const values = new Uint32Array(12)
  crypto.getRandomValues(values)
  hrForm.password = Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
  showPassword.value = true
}
const openCreate = () => {
  Object.assign(hrForm, { login: '', password: '', fullName: '', phone: '', email: '', position: '' })
  createOpen.value = true
}
const createHr = async () => {
  if (!hrValid.value) return
  const result = await run(
    () =>
      api.post<PublicUser>('/users/hr', {
        login: hrForm.login.trim(),
        password: hrForm.password,
        fullName: hrForm.fullName.trim(),
        phone: hrForm.phone.trim() || undefined,
        email: hrForm.email.trim() || undefined,
        position: hrForm.position.trim() || undefined,
      }),
    { successKey: 'users.hrCreated' },
  )
  if (result) {
    createOpen.value = false
    await load()
  }
}

const editOpen = ref(false)
const editing = ref<PublicUser | null>(null)
const editModel = ref<PersonalFormModel | null>(null)
const editForm = ref<{ valid: boolean } | null>(null)
const openEdit = (user: PublicUser) => {
  editing.value = user
  editModel.value = {
    fullName: user.fullName,
    pinfl: user.pinfl ?? '',
    phone: user.phone ?? '',
    email: user.email ?? '',
    position: user.position ?? '',
    baseSalary: user.baseSalary,
    hireDate: user.hireDate ?? '',
    birthDate: user.birthDate ?? '',
    address: user.address ?? '',
    photoFileId: user.photoFileId,
    passportFileIds: [...user.passportFileIds],
  }
  editOpen.value = true
}
const saveEdit = async () => {
  if (!editing.value || !editModel.value || !editForm.value?.valid) return
  const model = editModel.value
  const result = await run(
    () =>
      api.patch<EmployeeDetail>(`/users/${editing.value?.id}`, {
        fullName: model.fullName.trim(),
        pinfl: model.pinfl || undefined,
        phone: model.phone.trim() || undefined,
        email: model.email.trim() || undefined,
        position: model.position.trim() || undefined,
        baseSalary: model.baseSalary ?? undefined,
        photoFileId: model.photoFileId ?? undefined,
        passportFileIds: model.passportFileIds,
        hireDate: model.hireDate || undefined,
        birthDate: model.birthDate || undefined,
        address: model.address.trim() || undefined,
      }),
    { successKey: 'common.saved' },
  )
  if (result) {
    editOpen.value = false
    await load()
  }
}

const credentialsOpen = ref(false)
const credentialsTarget = ref<PublicUser | null>(null)
const openCredentials = (user: PublicUser) => {
  credentialsTarget.value = user
  credentialsOpen.value = true
}

const lookupId = ref('')
const lookupPending = ref(false)
const lookupById = async () => {
  const id = lookupId.value.trim()
  if (!id) return
  lookupPending.value = true
  try {
    const user = await api.get<EmployeeDetail>(`/users/${id}`)
    if (user.role === 'EMPLOYEE' || user.role === 'DEPARTMENT_HEAD') await router.push(`/employees/${user.id}`)
    else openEdit(user)
  } catch (error) {
    ui.toastError(error)
  } finally {
    lookupPending.value = false
  }
}

const openRow = (user: PublicUser) => {
  if (user.role === 'EMPLOYEE' || user.role === 'DEPARTMENT_HEAD') void router.push(`/employees/${user.id}`)
  else openEdit(user)
}
</script>

<template>
  <div>
    <UiPageHeader :title="t('nav.users')" :subtitle="t('users.subtitle', { total: data.total })">
      <form class="flex items-center gap-2" @submit.prevent="lookupById">
        <input v-model="lookupId" type="text" class="input w-72 py-1.5 font-mono text-xs" :placeholder="t('users.lookupPlaceholder')" />
        <button type="submit" class="btn-secondary" :disabled="!lookupId.trim() || lookupPending">
          <UiSpinner v-if="lookupPending" :size="14" />
          <UiIcon v-else name="search" :size="16" />
          {{ t('users.lookup') }}
        </button>
      </form>
      <button type="button" class="btn-primary" @click="openCreate">
        <UiIcon name="userPlus" :size="16" />
        {{ t('users.createHr') }}
      </button>
    </UiPageHeader>

    <UiDataTable
      :columns="columns"
      :rows="data.items"
      :total="data.total"
      :page="page"
      :limit="limit"
      :loading="loading"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :export-title="t('nav.users')"
      clickable
      @update:page="page = $event"
      @update:limit="(limit = $event), (page = 1)"
      @sort="onSort"
      @row-click="openRow"
    >
      <template #filters>
        <div class="relative">
          <UiIcon name="search" :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="filters.search" type="search" class="input w-56 pl-9 py-1.5 text-xs" :placeholder="t('common.search')" />
        </div>
        <UiSelect v-model="filters.role" :options="roleOptions" :placeholder="t('common.allRoles')" size="sm" class="w-44" />
        <UiSelect v-model="filters.status" :options="statusOptions" :placeholder="t('common.allStatuses')" size="sm" class="w-40" />
      </template>
      <template #cell-fullName="{ row }">
        <div class="flex items-center gap-3">
          <UiAvatar :file-id="row.photoFileId" :name="row.fullName" size="sm" />
          <span class="font-medium text-slate-900">{{ row.fullName }}</span>
        </div>
      </template>
      <template #cell-login="{ row }"><span class="font-mono text-xs text-slate-600">@{{ row.login }}</span></template>
      <template #cell-role="{ row }"><UiBadge enum-name="UserRole" :value="row.role" /></template>
      <template #cell-status="{ row }"><UiBadge enum-name="EmployeeStatus" :value="row.status" /></template>
      <template #cell-mustChangePassword="{ row }"><UiBadge v-if="row.mustChangePassword" tone="amber" :label="t('common.yes')" /><span v-else class="text-slate-400">—</span></template>
      <template #rowActions="{ row }">
        <button type="button" class="btn-icon" :title="t('common.edit')" @click="openEdit(row)"><UiIcon name="pencil" :size="16" /></button>
        <button type="button" class="btn-icon" :title="t('users.resetCredentials')" @click="openCredentials(row)"><UiIcon name="key" :size="16" /></button>
      </template>
    </UiDataTable>

    <UiModal :open="createOpen" :title="t('users.createHr')" :subtitle="t('users.createHrHint')" size="lg" @close="createOpen = false">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiFormField :label="t('auth.loginField')" required :error="hrLoginError">
          <input v-model="hrForm.login" type="text" class="input" autocomplete="off" />
        </UiFormField>
        <UiFormField :label="t('auth.password')" required :error="hrForm.password && hrForm.password.length < 8 ? t('validation.minLength', { n: 8 }) : ''">
          <div class="flex gap-2">
            <div class="relative flex-1">
              <input v-model="hrForm.password" :type="showPassword ? 'text' : 'password'" class="input pr-10" autocomplete="new-password" />
              <button type="button" class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700" @click="showPassword = !showPassword"><UiIcon :name="showPassword ? 'eye' : 'lock'" :size="16" /></button>
            </div>
            <button type="button" class="btn-secondary" @click="generatePassword"><UiIcon name="sparkles" :size="16" /></button>
          </div>
        </UiFormField>
        <UiFormField :label="t('employees.fullName')" required class="sm:col-span-2">
          <input v-model="hrForm.fullName" type="text" class="input" />
        </UiFormField>
        <UiFormField :label="t('employees.phone')">
          <input v-model="hrForm.phone" type="tel" class="input" />
        </UiFormField>
        <UiFormField :label="t('employees.email')">
          <input v-model="hrForm.email" type="email" class="input" />
        </UiFormField>
        <UiFormField :label="t('employees.position')" class="sm:col-span-2">
          <input v-model="hrForm.position" type="text" class="input" />
        </UiFormField>
      </div>
      <template #footer>
        <button type="button" class="btn-secondary" @click="createOpen = false">{{ t('common.cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="!hrValid || pending" @click="createHr">
          <UiSpinner v-if="pending" />
          {{ t('common.create') }}
        </button>
      </template>
    </UiModal>

    <UiModal :open="editOpen" :title="t('employees.editPersonalData')" :subtitle="editing ? `${editing.fullName} · ${enumLabel('UserRole', editing.role)}` : ''" size="xl" @close="editOpen = false">
      <EmployeesPersonalForm v-if="editModel" ref="editForm" v-model="editModel" :show-salary="editing?.role === 'EMPLOYEE' || editing?.role === 'DEPARTMENT_HEAD'" />
      <template #footer>
        <button type="button" class="btn-secondary" @click="editOpen = false">{{ t('common.cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="pending || !editForm?.valid" @click="saveEdit">
          <UiSpinner v-if="pending" />
          {{ t('common.save') }}
        </button>
      </template>
    </UiModal>

    <EmployeesCredentialsDialog v-if="credentialsTarget" :open="credentialsOpen" :user="credentialsTarget" @close="credentialsOpen = false" @saved="(credentialsOpen = false), load()" />
  </div>
</template>
