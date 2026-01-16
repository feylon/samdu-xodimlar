<script setup lang="ts">
import type { DepartmentDetail, DepartmentMember } from '~/types/api'
import type { DataTableColumn } from '~/components/ui/DataTable.vue'

definePageMeta({ title: 'nav.departments' })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const auth = useAuthStore()
const format = useFormat()
const enumLabel = useEnumLabel()
const route = useRoute()
const router = useRouter()

const department = ref<DepartmentDetail | null>(null)
const loading = ref(true)

const load = async () => {
  loading.value = true
  try {
    department.value = await api.get<DepartmentDetail>(`/departments/${String(route.params.id)}`)
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}
onMounted(load)

const canOpenProfiles = computed(() => auth.hasRole(['HR', 'SUPERADMIN', 'DEPARTMENT_HEAD']))

const columns = computed<DataTableColumn<DepartmentMember>[]>(() => [
  { key: 'fullName', label: t('employees.fullName') },
  { key: 'login', label: t('auth.loginField') },
  { key: 'position', label: t('employees.position') },
  { key: 'role', label: t('common.role'), format: (row) => (row.isHead ? t('departments.head') : enumLabel('UserRole', row.role)) },
  { key: 'rate', label: t('employees.rate'), type: 'number', align: 'right', format: (row) => `${row.rate}%` },
  { key: 'status', label: t('common.status'), format: (row) => enumLabel('EmployeeStatus', row.status) },
  { key: 'startDate', label: t('common.startDate'), type: 'date' },
])
</script>

<template>
  <div>
    <UiPageHeader :title="department?.name ?? t('nav.departments')" :subtitle="department ? `${department.code}${department.description ? ` · ${department.description}` : ''}` : ''" back-to="/departments">
      <template v-if="department" #meta>
        <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span class="inline-flex items-center gap-2">
            <UiAvatar :file-id="department.head?.photoFileId" :name="department.head?.fullName ?? '?'" size="xs" />
            {{ t('departments.head') }}: <span class="font-medium text-slate-800">{{ department.head?.fullName ?? t('departments.noHead') }}</span>
          </span>
          <UiBadge :label="`${department.memberCount} ${t('departments.members')}`" tone="brand" :dot="false" />
          <UiBadge :label="`${department.totalRate}% ${t('departments.totalRate')}`" tone="slate" :dot="false" />
          <UiBadge v-if="!department.isActive" tone="slate" :label="t('common.inactive')" />
        </div>
      </template>
    </UiPageHeader>

    <UiDataTable
      :columns="columns"
      :rows="department?.members ?? []"
      :loading="loading"
      :paginated="false"
      :export-title="`${t('departments.members')} — ${department?.name ?? ''}`"
      :clickable="canOpenProfiles"
      :empty-title="t('departments.noMembers')"
      @row-click="canOpenProfiles && router.push(`/employees/${$event.userId}`)"
    >
      <template #cell-fullName="{ row }">
        <div class="flex items-center gap-3">
          <UiAvatar :file-id="row.photoFileId" :name="row.fullName" size="sm" />
          <span class="font-medium text-slate-900">{{ row.fullName }}</span>
          <UiBadge v-if="row.isHead" tone="amber" :label="t('departments.head')" />
        </div>
      </template>
      <template #cell-login="{ row }">
        <span class="font-mono text-xs text-slate-600">@{{ row.login }}</span>
      </template>
      <template #cell-status="{ row }">
        <UiBadge enum-name="EmployeeStatus" :value="row.status" />
      </template>
      <template #cell-startDate="{ row }">{{ format.date(row.startDate) }}</template>
    </UiDataTable>
  </div>
</template>
