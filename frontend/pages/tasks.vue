<script setup lang="ts">
import type { Paginated, Task, TaskStatus } from '~/types/api'
import type { DataTableColumn } from '~/components/ui/DataTable.vue'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from '~/utils/enums'

definePageMeta({ title: 'nav.tasks' })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const auth = useAuthStore()
const format = useFormat()
const enumLabel = useEnumLabel()
const route = useRoute()
const { departments, selectOptions: departmentOptions } = useDepartments()
const { pending, run } = useAsyncAction()

const managedDepartments = computed(() => departments.value.filter((department) => department.headUserId === auth.user?.id))
const canManage = computed(() => auth.isHead)

const view = ref<'table' | 'board'>(auth.isEmployee ? 'board' : 'table')

const filters = reactive({
  status: typeof route.query.status === 'string' ? route.query.status : '',
  type: '',
  priority: '',
  departmentId: '',
  assigneeId: null as string | null,
  search: '',
  from: '',
  to: '',
})
const page = ref(1)
const limit = ref(20)
const sortBy = ref('createdAt')
const sortOrder = ref<'ASC' | 'DESC'>('DESC')
const data = ref<Paginated<Task>>({ items: [], total: 0, page: 1, limit: 20 })
const loading = ref(false)
const debouncedSearch = useDebouncedRef(toRef(filters, 'search'), 400)

const load = async () => {
  loading.value = true
  try {
    const boardMode = view.value === 'board'
    data.value = await api.get<Paginated<Task>>('/tasks', {
      status: boardMode ? undefined : filters.status || undefined,
      type: filters.type || undefined,
      priority: filters.priority || undefined,
      departmentId: filters.departmentId || undefined,
      assigneeId: filters.assigneeId ?? undefined,
      search: debouncedSearch.value || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      page: boardMode ? 1 : page.value,
      limit: boardMode ? 200 : limit.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    })
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}

watch([debouncedSearch, () => filters.status, () => filters.type, () => filters.priority, () => filters.departmentId, () => filters.assigneeId, () => filters.from, () => filters.to, view], () => {
  page.value = 1
  void load()
})
watch([page, limit, sortBy, sortOrder], load)
onMounted(load)

const statusOptions = TASK_STATUSES.map((status) => ({ value: status, label: enumLabel('TaskStatus', status) }))
const typeOptions = TASK_TYPES.map((type) => ({ value: type, label: enumLabel('TaskType', type) }))
const priorityOptions = TASK_PRIORITIES.map((priority) => ({ value: priority, label: enumLabel('TaskPriority', priority) }))

const today = new Date().toISOString().slice(0, 10)
const isOverdue = (task: Task) => Boolean(task.dueDate && task.dueDate < today && ['ASSIGNED', 'IN_PROGRESS', 'REJECTED'].includes(task.status))

const columns = computed<DataTableColumn<Task>[]>(() => [
  { key: 'title', label: t('tasks.title'), sortable: true },
  { key: 'assignee', label: t('tasks.assignee'), format: (row) => row.assignee?.fullName ?? '' },
  { key: 'departmentName', label: t('departments.department') },
  { key: 'type', label: t('tasks.type'), format: (row) => enumLabel('TaskType', row.type) },
  { key: 'priority', label: t('tasks.priority'), sortable: true, format: (row) => enumLabel('TaskPriority', row.priority) },
  { key: 'status', label: t('common.status'), sortable: true, format: (row) => enumLabel('TaskStatus', row.status) },
  { key: 'dueDate', label: t('tasks.dueDate'), sortable: true, type: 'date' },
  { key: 'points', label: t('kpi.points'), type: 'number', align: 'right', format: (row) => (row.awardedPoints !== null ? `${row.awardedPoints} / ${row.maxPoints}` : String(row.maxPoints)) },
  { key: 'createdAt', label: t('common.createdAt'), sortable: true, type: 'datetime' },
])

const selected = ref<Task | null>(null)
const editorOpen = ref(false)
const editing = ref<Task | null>(null)
const verifyOpen = ref(false)
const verifying = ref<Task | null>(null)
const deleting = ref<Task | null>(null)

const replaceTask = (task: Task) => {
  data.value.items = data.value.items.map((item) => (item.id === task.id ? task : item))
  if (selected.value?.id === task.id) selected.value = task
}

const openCreate = () => {
  editing.value = null
  editorOpen.value = true
}

const openEdit = (task: Task) => {
  editing.value = task
  editorOpen.value = true
}

const onSaved = async (task: Task) => {
  editorOpen.value = false
  if (editing.value) replaceTask(task)
  else await load()
}

const openVerify = (task: Task) => {
  verifying.value = task
  verifyOpen.value = true
}

const onVerified = (task: Task) => {
  verifyOpen.value = false
  replaceTask(task)
}

const confirmDelete = async () => {
  if (!deleting.value) return
  const result = await run(() => api.delete(`/tasks/${deleting.value?.id}`), { successKey: 'tasks.deleted' })
  if (result !== undefined) {
    data.value.items = data.value.items.filter((item) => item.id !== deleting.value?.id)
    data.value.total = Math.max(0, data.value.total - 1)
    if (selected.value?.id === deleting.value.id) selected.value = null
    deleting.value = null
  }
}

const quickStatus = async (task: Task, status: TaskStatus) => {
  const result = await run(() => api.patch<Task>(`/tasks/${task.id}/status`, { status }), { successKey: 'tasks.statusUpdated' })
  if (result) replaceTask(result)
}

const onSort = (payload: { sortBy: string; sortOrder: 'ASC' | 'DESC' }) => {
  sortBy.value = payload.sortBy
  sortOrder.value = payload.sortOrder
}

const resetFilters = () => Object.assign(filters, { status: '', type: '', priority: '', departmentId: '', assigneeId: null, search: '', from: '', to: '' })
</script>

<template>
  <div>
    <UiPageHeader :title="t('nav.tasks')" :subtitle="t('tasks.subtitle', { total: data.total })">
      <div class="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
        <button type="button" class="rounded-md px-3 py-1.5 transition" :class="view === 'table' ? 'bg-brand text-white' : 'text-slate-600'" @click="view = 'table'">{{ t('tasks.tableView') }}</button>
        <button type="button" class="rounded-md px-3 py-1.5 transition" :class="view === 'board' ? 'bg-brand text-white' : 'text-slate-600'" @click="view = 'board'">{{ t('tasks.boardView') }}</button>
      </div>
      <button v-if="canManage && managedDepartments.length" type="button" class="btn-primary" @click="openCreate">
        <UiIcon name="plus" :size="16" />
        {{ t('tasks.create') }}
      </button>
    </UiPageHeader>

    <div v-if="view === 'board'" class="space-y-4">
      <div class="card flex flex-wrap items-end gap-2 px-4 py-3">
        <div class="relative">
          <UiIcon name="search" :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="filters.search" type="search" class="input w-56 pl-9 py-1.5 text-xs" :placeholder="t('common.search')" />
        </div>
        <UiSelect v-model="filters.type" :options="typeOptions" :placeholder="t('tasks.allTypes')" size="sm" class="w-36" />
        <UiSelect v-model="filters.priority" :options="priorityOptions" :placeholder="t('tasks.allPriorities')" size="sm" class="w-40" />
        <UiSelect v-if="!auth.isEmployee" v-model="filters.departmentId" :options="departmentOptions" :placeholder="t('common.allDepartments')" size="sm" class="w-48" />
      </div>
      <TasksBoard :tasks="data.items" :loading="loading" @open="selected = $event" @status="quickStatus" />
    </div>

    <UiDataTable
      v-else
      :columns="columns"
      :rows="data.items"
      :total="data.total"
      :page="page"
      :limit="limit"
      :loading="loading"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :export-title="t('nav.tasks')"
      clickable
      @update:page="page = $event"
      @update:limit="(limit = $event), (page = 1)"
      @sort="onSort"
      @row-click="selected = $event"
    >
      <template #filters>
        <div class="relative">
          <UiIcon name="search" :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="filters.search" type="search" class="input w-48 pl-9 py-1.5 text-xs" :placeholder="t('common.search')" />
        </div>
        <UiSelect v-model="filters.status" :options="statusOptions" :placeholder="t('common.allStatuses')" size="sm" class="w-40" />
        <UiSelect v-model="filters.type" :options="typeOptions" :placeholder="t('tasks.allTypes')" size="sm" class="w-32" />
        <UiSelect v-model="filters.priority" :options="priorityOptions" :placeholder="t('tasks.allPriorities')" size="sm" class="w-36" />
        <UiSelect v-if="!auth.isEmployee" v-model="filters.departmentId" :options="departmentOptions" :placeholder="t('common.allDepartments')" size="sm" class="w-44" />
        <EmployeesSearch v-if="!auth.isEmployee" v-model="filters.assigneeId" class="w-48" :placeholder="t('tasks.assignee')" />
        <input v-model="filters.from" type="date" class="input w-36 py-1.5 text-xs" :title="t('common.from')" />
        <input v-model="filters.to" type="date" class="input w-36 py-1.5 text-xs" :title="t('common.to')" />
        <button type="button" class="btn-ghost btn-sm" @click="resetFilters">
          <UiIcon name="close" :size="14" />
          {{ t('common.reset') }}
        </button>
      </template>
      <template #cell-title="{ row }">
        <div class="min-w-[180px]">
          <p class="font-medium text-slate-900">{{ row.title }}</p>
          <p v-if="row.description" class="line-clamp-1 text-xs text-slate-500">{{ row.description }}</p>
        </div>
      </template>
      <template #cell-assignee="{ row }">
        <div class="flex items-center gap-2">
          <UiAvatar :file-id="row.assignee?.photoFileId" :name="row.assignee?.fullName" size="xs" />
          <span class="truncate">{{ row.assignee?.fullName ?? '—' }}</span>
        </div>
      </template>
      <template #cell-type="{ row }"><UiBadge enum-name="TaskType" :value="row.type" /></template>
      <template #cell-priority="{ row }"><UiBadge enum-name="TaskPriority" :value="row.priority" /></template>
      <template #cell-status="{ row }"><UiBadge enum-name="TaskStatus" :value="row.status" /></template>
      <template #cell-dueDate="{ row }">
        <span :class="isOverdue(row) ? 'font-semibold text-red-600' : ''">{{ format.date(row.dueDate) }}</span>
      </template>
      <template v-if="canManage" #rowActions="{ row }">
        <button v-if="['COMPLETED', 'PARTIALLY_COMPLETED'].includes(row.status)" type="button" class="btn-icon text-green-600" :title="t('tasks.verify')" @click="openVerify(row)">
          <UiIcon name="checkCircle" :size="16" />
        </button>
        <button v-if="row.status !== 'VERIFIED'" type="button" class="btn-icon" :title="t('common.edit')" @click="openEdit(row)">
          <UiIcon name="pencil" :size="16" />
        </button>
        <button v-if="row.status !== 'VERIFIED'" type="button" class="btn-icon text-red-500" :title="t('common.delete')" @click="deleting = row">
          <UiIcon name="trash" :size="16" />
        </button>
      </template>
    </UiDataTable>

    <TasksDetailDrawer :task="selected" :can-manage="canManage" @close="selected = null" @edit="openEdit" @verify="openVerify" @remove="deleting = $event" @updated="replaceTask" />
    <TasksEditorDialog :open="editorOpen" :task="editing" :departments="managedDepartments" @close="editorOpen = false" @saved="onSaved" />
    <TasksVerifyDialog :open="verifyOpen" :task="verifying" @close="verifyOpen = false" @saved="onVerified" />
    <UiConfirmDialog :open="deleting !== null" :title="t('tasks.deleteTitle')" :message="t('tasks.deleteMessage', { title: deleting?.title ?? '' })" :confirm-label="t('common.delete')" danger :pending="pending" @confirm="confirmDelete" @cancel="deleting = null" />
  </div>
</template>
