<script setup lang="ts">
import type { Department, DepartmentDetail, Task } from '~/types/api'
import { TASK_PRIORITIES, TASK_TYPES } from '~/utils/enums'

const props = defineProps<{ open: boolean; task: Task | null; departments: Department[] }>()
const emit = defineEmits<{ close: []; saved: [task: Task] }>()

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const enumLabel = useEnumLabel()
const { pending, run } = useAsyncAction()

const form = reactive({
  title: '',
  description: '',
  departmentId: '',
  assigneeId: '',
  type: 'REGULAR',
  priority: 'MEDIUM',
  dueDate: '',
  maxPoints: 10,
  attachmentFileIds: [] as string[],
})

const members = ref<DepartmentDetail['members']>([])
const membersLoading = ref(false)

const loadMembers = async (departmentId: string) => {
  if (!departmentId) {
    members.value = []
    return
  }
  membersLoading.value = true
  try {
    const detail = await api.get<DepartmentDetail>(`/departments/${departmentId}`)
    members.value = detail.members
  } catch (error) {
    ui.toastError(error)
  } finally {
    membersLoading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    if (props.task) {
      Object.assign(form, {
        title: props.task.title,
        description: props.task.description ?? '',
        departmentId: props.task.departmentId,
        assigneeId: props.task.assigneeId,
        type: props.task.type,
        priority: props.task.priority,
        dueDate: props.task.dueDate ?? '',
        maxPoints: props.task.maxPoints,
        attachmentFileIds: [...props.task.attachmentFileIds],
      })
    } else {
      Object.assign(form, { title: '', description: '', departmentId: props.departments[0]?.id ?? '', assigneeId: '', type: 'REGULAR', priority: 'MEDIUM', dueDate: '', maxPoints: 10, attachmentFileIds: [] })
    }
    void loadMembers(form.departmentId)
  },
)

watch(
  () => form.departmentId,
  (value, previous) => {
    if (props.open && value !== previous && previous !== undefined) {
      form.assigneeId = ''
      void loadMembers(value)
    }
  },
)

const departmentOptions = computed(() => props.departments.map((department) => ({ value: department.id, label: `${department.name} (${department.code})` })))
const memberOptions = computed(() => members.value.filter((member) => member.status === 'ACTIVE' || member.userId === form.assigneeId).map((member) => ({ value: member.userId, label: `${member.fullName}${member.position ? ` · ${member.position}` : ''}` })))
const typeOptions = TASK_TYPES.map((type) => ({ value: type, label: enumLabel('TaskType', type) }))
const priorityOptions = TASK_PRIORITIES.map((priority) => ({ value: priority, label: enumLabel('TaskPriority', priority) }))

const valid = computed(() => form.title.trim().length >= 3 && Boolean(form.departmentId) && Boolean(form.assigneeId) && form.maxPoints >= 1 && form.maxPoints <= 100)

const submit = async () => {
  if (!valid.value) return
  const payload = {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    assigneeId: form.assigneeId,
    type: form.type,
    priority: form.priority,
    dueDate: form.dueDate || undefined,
    maxPoints: Number(form.maxPoints),
    attachmentFileIds: form.attachmentFileIds,
  }
  const result = props.task
    ? await run(() => api.patch<Task>(`/tasks/${props.task?.id}`, payload), { successKey: 'common.saved' })
    : await run(() => api.post<Task>('/tasks', { ...payload, departmentId: form.departmentId }), { successKey: 'tasks.created' })
  if (result) emit('saved', result)
}
</script>

<template>
  <UiModal :open="open" :title="task ? t('tasks.edit') : t('tasks.create')" size="lg" @close="emit('close')">
    <div class="grid gap-4 sm:grid-cols-2">
      <UiFormField :label="t('tasks.title')" required class="sm:col-span-2">
        <input v-model="form.title" type="text" class="input" />
      </UiFormField>
      <UiFormField :label="t('common.description')" class="sm:col-span-2">
        <textarea v-model="form.description" rows="4" class="input" />
      </UiFormField>
      <UiFormField :label="t('departments.department')" required>
        <UiSelect v-model="form.departmentId" :options="departmentOptions" :clearable="false" :disabled="Boolean(task)" :placeholder="t('common.select')" />
      </UiFormField>
      <UiFormField :label="t('tasks.assignee')" required>
        <UiSelect v-model="form.assigneeId" :options="memberOptions" :clearable="false" :disabled="membersLoading" :placeholder="membersLoading ? t('common.loading') : t('common.select')" />
      </UiFormField>
      <UiFormField :label="t('tasks.type')">
        <UiSelect v-model="form.type" :options="typeOptions" :clearable="false" />
      </UiFormField>
      <UiFormField :label="t('tasks.priority')">
        <UiSelect v-model="form.priority" :options="priorityOptions" :clearable="false" />
      </UiFormField>
      <UiFormField :label="t('tasks.dueDate')">
        <input v-model="form.dueDate" type="date" class="input" />
      </UiFormField>
      <UiFormField :label="t('tasks.maxPoints')" required>
        <input v-model.number="form.maxPoints" type="number" min="1" max="100" class="input tabular-nums" />
      </UiFormField>
      <UiFormField :label="t('common.attachments')" class="sm:col-span-2">
        <UiFileUpload v-model="form.attachmentFileIds" category="DOCUMENT" accept="image/jpeg,image/png,image/webp,application/pdf,.docx,.xlsx,.txt" multiple preview-size="sm" />
      </UiFormField>
    </div>
    <template #footer>
      <button type="button" class="btn-secondary" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button type="button" class="btn-primary" :disabled="!valid || pending" @click="submit">
        <UiSpinner v-if="pending" />
        {{ t('common.save') }}
      </button>
    </template>
  </UiModal>
</template>
