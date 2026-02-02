<script setup lang="ts">
import type { PayrollRecord } from '~/types/api'

const props = defineProps<{ record: PayrollRecord | null }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const format = useFormat()

const rows = computed(() => {
  const record = props.record
  if (!record) return []
  const breakdown = record.breakdown
  const currency = record.currency
  return [
    { label: t('payroll.baseSalary'), value: format.money(breakdown.baseSalary, currency) },
    { label: t('payroll.totalRate'), value: `${breakdown.totalRate}%` },
    { label: t('payroll.baseAmount'), value: format.money(record.baseAmount, currency) },
    { label: t('payroll.workingDays'), value: String(breakdown.workingDays) },
    { label: t('payroll.presentDays'), value: String(breakdown.presentDays) },
    { label: t('payroll.attendanceRatio'), value: format.percent(breakdown.attendanceRatio) },
    { label: t('payroll.attendanceAmount'), value: format.money(breakdown.attendanceAmount, currency), strong: true },
    { label: t('kpi.taskPoints'), value: String(breakdown.taskPoints) },
    { label: t('kpi.bonusPoints'), value: String(breakdown.bonusPoints) },
    { label: t('kpi.reportPoints'), value: String(breakdown.reportPoints) },
    { label: t('kpi.manualPoints'), value: format.points(breakdown.manualPoints) },
    { label: t('payroll.pointValue'), value: format.money(breakdown.pointValue, currency) },
    { label: t('payroll.pointsAmount'), value: format.money(breakdown.pointsAmount, currency), strong: true },
  ]
})

const headRows = computed(() => {
  const record = props.record
  if (!record?.breakdown.isDepartmentHead) return []
  return [
    { label: t('payroll.teamPerformanceRatio'), value: format.percent(record.breakdown.teamPerformanceRatio) },
    { label: t('payroll.teamBonusAmount'), value: format.money(record.breakdown.teamBonusAmount, record.currency), strong: true },
    { label: t('payroll.teamPointsAmount'), value: format.money(record.breakdown.teamPointsAmount, record.currency), strong: true },
  ]
})
</script>

<template>
  <UiDrawer :open="record !== null" :title="record ? format.period(record.year, record.month) : ''" :subtitle="record?.user?.fullName ?? ''" width="lg" @close="emit('close')">
    <div v-if="record" class="space-y-5">
      <div class="rounded-xl bg-brand/5 p-4">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ t('payroll.totalAmount') }}</p>
          <UiBadge enum-name="PayrollStatus" :value="record.status" size="sm" />
        </div>
        <p class="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{{ format.money(record.totalAmount, record.currency) }}</p>
        <div class="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div><p class="text-slate-500">{{ t('payroll.attendanceAmount') }}</p><p class="font-medium tabular-nums">{{ format.money(record.attendanceAmount, record.currency) }}</p></div>
          <div><p class="text-slate-500">{{ t('payroll.bonusAmount') }}</p><p class="font-medium tabular-nums">{{ format.money(record.bonusAmount, record.currency) }}</p></div>
          <div><p class="text-slate-500">{{ t('payroll.deductionAmount') }}</p><p class="font-medium tabular-nums">{{ format.money(record.deductionAmount, record.currency) }}</p></div>
        </div>
      </div>

      <div>
        <h4 class="mb-2 text-sm font-semibold text-slate-900">{{ t('payroll.breakdown') }}</h4>
        <dl class="divide-y divide-slate-100 rounded-lg border border-slate-200">
          <div v-for="row in rows" :key="row.label" class="flex items-center justify-between px-3 py-2 text-sm">
            <dt class="text-slate-600">{{ row.label }}</dt>
            <dd class="tabular-nums" :class="row.strong ? 'font-semibold text-slate-900' : 'text-slate-800'">{{ row.value }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="headRows.length">
        <h4 class="mb-2 text-sm font-semibold text-slate-900">{{ t('payroll.teamBonus') }}</h4>
        <dl class="divide-y divide-slate-100 rounded-lg border border-amber-200 bg-amber-50/40">
          <div v-for="row in headRows" :key="row.label" class="flex items-center justify-between px-3 py-2 text-sm">
            <dt class="text-slate-600">{{ row.label }}</dt>
            <dd class="tabular-nums" :class="row.strong ? 'font-semibold text-slate-900' : 'text-slate-800'">{{ row.value }}</dd>
          </div>
        </dl>
      </div>

      <div>
        <h4 class="mb-2 text-sm font-semibold text-slate-900">{{ t('nav.departments') }}</h4>
        <div class="flex flex-wrap gap-1.5">
          <UiBadge v-for="department in record.breakdown.departments" :key="department.departmentId" :label="`${department.departmentName} · ${department.rate}%`" tone="brand" :dot="false" />
        </div>
      </div>

      <dl class="grid grid-cols-2 gap-3 text-xs text-slate-600">
        <div><dt class="text-slate-500">{{ t('payroll.calculatedAt') }}</dt><dd class="font-medium text-slate-800">{{ format.dateTime(record.calculatedAt) }}</dd></div>
        <div><dt class="text-slate-500">{{ t('payroll.paidAt') }}</dt><dd class="font-medium text-slate-800">{{ format.dateTime(record.paidAt) }}</dd></div>
        <div v-if="record.note" class="col-span-2"><dt class="text-slate-500">{{ t('common.note') }}</dt><dd class="font-medium text-slate-800">{{ record.note }}</dd></div>
      </dl>
    </div>
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </UiDrawer>
</template>
