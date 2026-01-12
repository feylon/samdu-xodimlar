<script setup lang="ts">
import type { EmployeeListItem, Paginated } from '~/types/api'
import type { DataTableColumn } from '~/components/ui/DataTable.vue'
import { EMPLOYEE_STATUSES } from '~/utils/enums'

definePageMeta({ title: 'nav.employees', middleware: 'role', roles: ['HR', 'SUPERADMIN', 'DEPARTMENT_HEAD'] })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const auth = useAuthStore()
const format = useFormat()
const enumLabel = useEnumLabel()
const route = useRoute()
const router = useRouter()
const { selectOptions: departmentOptions } = useDepartments()

const filters = reactive({
  search: typeof route.query.search === 'string' ? route.query.search : '',
  status: (typeof route.query.status === 'string' ? route.query.status : '') as string,
  departmentId: typeof route.query.departmentId === 'string' ? route.query.departmentId : '',
  role: typeof route.query.role === 'string' ? route.query.role : '',
})
const page = ref(1)
const limit = ref(20)
const sortBy = ref('fullName')
const sortOrder = ref<'ASC' | 'DESC'>('ASC')
const data = ref<Paginated<EmployeeListItem>>({ items: [], total: 0, page: 1, limit: 20 })
const loading = ref(false)

const debouncedSearch = useDebouncedRef(toRef(filters, 'search'), 400)

const load = async () => {
  loading.value = true
  try {
    data.value = await api.get<Paginated<EmployeeListItem>>('/employees', {
      search: debouncedSearch.value || undefined,
      status: filters.status || undefined,
      departmentId: filters.departmentId || undefined,
      role: filters.role || undefined,
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

watch([debouncedSearch, () => filters.status, () => filters.departmentId, () => filters.role], () => {
  page.value = 1
  void load()
})
watch([page, limit, sortBy, sortOrder], load)
watch(
  () => route.query.search,
  (value) => {
    if (typeof value === 'string' && value !== filters.search) filters.search = value
  },
)
onMounted(load)

const statusOptions = EMPLOYEE_STATUSES.map((status) => ({ value: status, label: enumLabel('EmployeeStatus', status) }))
const roleOptions = ['EMPLOYEE', 'DEPARTMENT_HEAD'].map((role) => ({ value: role, label: enumLabel('UserRole', role) }))

const columns = computed<DataTableColumn<EmployeeListItem>[]>(() => [
  { key: 'fullName', label: t('employees.fullName'), sortable: true },
  { key: 'login', label: t('auth.loginField'), sortable: true },
  { key: 'position', label: t('employees.position'), sortable: true },
  { key: 'assignments', label: t('nav.departments'), format: (row) => row.assignments.map((assignment) => `${assignment.departmentName} ${assignment.rate}%`).join(', ') },
  { key: 'status', label: t('common.status'), sortable: true, format: (row) => enumLabel('EmployeeStatus', row.status) },
  { key: 'baseSalary', label: t('employees.baseSalary'), sortable: true, type: 'number', align: 'right', format: (row) => format.money(row.baseSalary) },
  { key: 'hireDate', label: t('employees.hireDate'), type: 'date' },
])

const onSort = (payload: { sortBy: string; sortOrder: 'ASC' | 'DESC' }) => {
  sortBy.value = payload.sortBy
  sortOrder.value = payload.sortOrder
}

const resetFilters = () => {
  Object.assign(filters, { search: '', status: '', departmentId: '', role: '' })
  void router.replace({ query: {} })
}

const hasFilters = computed(() => Boolean(filters.search || filters.status || filters.departmentId || filters.role))
</script>

<template>
  <div>
    <UiPageHeader :title="t('nav.employees')" :subtitle="t('employees.subtitle', { total: data.total })">
      <NuxtLink v-if="auth.isHr" to="/employees/new" class="btn-primary">
        <UiIcon name="userPlus" :size="16" />
        {{ t('employees.onboard') }}
      </NuxtLink>
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
      :export-title="t('nav.employees')"
      clickable
      @update:page="page = $event"
      @update:limit="(limit = $event), (page = 1)"
      @sort="onSort"
      @row-click="router.push(`/employees/${$event.id}`)"
    >
      <template #filters>
        <div class="relative">
          <UiIcon name="search" :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="filters.search" type="search" class="input w-56 pl-9 py-1.5 text-xs" :placeholder="t('common.search')" />
        </div>
        <UiSelect v-model="filters.status" :options="statusOptions" :placeholder="t('common.allStatuses')" size="sm" class="w-40" />
        <UiSelect v-model="filters.departmentId" :options="departmentOptions" :placeholder="t('common.allDepartments')" size="sm" class="w-48" />
        <UiSelect v-model="filters.role" :options="roleOptions" :placeholder="t('common.allRoles')" size="sm" class="w-40" />
        <button v-if="hasFilters" type="button" class="btn-ghost btn-sm" @click="resetFilters">
          <UiIcon name="close" :size="14" />
          {{ t('common.reset') }}
        </button>
      </template>
      <template #cell-fullName="{ row }">
        <div class="flex items-center gap-3">
          <UiAvatar :file-id="row.photoFileId" :name="row.fullName" size="sm" />
          <div class="min-w-0">
            <p class="truncate font-medium text-slate-900">{{ row.fullName }}</p>
            <p class="truncate text-xs text-slate-500">{{ enumLabel('UserRole', row.role) }}</p>
          </div>
        </div>
      </template>
      <template #cell-login="{ row }">
        <span class="font-mono text-xs text-slate-600">@{{ row.login }}</span>
      </template>
      <template #cell-assignments="{ row }">
        <div class="flex flex-wrap gap-1">
          <UiBadge v-for="assignment in row.assignments" :key="assignment.departmentId" :label="`${assignment.departmentName} · ${assignment.rate}%`" tone="brand" :dot="false" />
          <span v-if="row.assignments.length === 0" class="text-xs text-slate-400">—</span>
        </div>
      </template>
      <template #cell-status="{ row }">
        <UiBadge enum-name="EmployeeStatus" :value="row.status" />
      </template>
    </UiDataTable>
  </div>
</template>
