<script setup lang="ts">
definePageMeta({ title: 'nav.attendance' })

const { t } = useI18n()
const auth = useAuthStore()
const { departments, selectOptions } = useDepartments()

const managedDepartments = computed(() => departments.value.filter((department) => department.headUserId === auth.user?.id))
const managedOptions = computed(() => managedDepartments.value.map((department) => ({ value: department.id, label: `${department.name} (${department.code})` })))
const selectedDepartment = ref<string>('')

watch(managedDepartments, (list) => {
  if (!selectedDepartment.value && list.length) selectedDepartment.value = list[0].id
})

const tab = ref('today')
const tabs = computed(() => [
  { key: 'today', label: t('attendance.todaySheet') },
  { key: 'history', label: t('attendance.history') },
  { key: 'mine', label: t('attendance.myAttendance') },
])
</script>

<template>
  <div>
    <UiPageHeader :title="t('nav.attendance')" :subtitle="auth.isHead ? t('attendance.headSubtitle') : auth.isEmployee ? t('attendance.employeeSubtitle') : t('attendance.managementSubtitle')" />

    <AttendanceMonthlySummary v-if="auth.isEmployee" />

    <AttendanceHistoryTable v-else-if="auth.isManagement" :department-options="selectOptions" />

    <template v-else>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <UiTabs v-model="tab" :tabs="tabs" class="flex-1" />
        <UiSelect v-if="tab !== 'mine'" v-model="selectedDepartment" :options="managedOptions" :clearable="false" :placeholder="t('departments.selectDepartment')" size="sm" class="w-64" />
      </div>
      <UiEmptyState v-if="tab !== 'mine' && managedDepartments.length === 0" :title="t('attendance.noManagedDepartments')" icon="building" />
      <AttendanceTodaySheet v-else-if="tab === 'today' && selectedDepartment" :department-id="selectedDepartment" />
      <AttendanceHistoryTable v-else-if="tab === 'history'" :department-options="managedOptions" :fixed-department-id="selectedDepartment" />
      <AttendanceMonthlySummary v-else-if="tab === 'mine'" />
    </template>
  </div>
</template>
