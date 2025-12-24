<script setup lang="ts" generic="Row extends Record<string, any>">
export interface DataTableColumn<R = Record<string, unknown>> {
  key: string
  label: string
  sortable?: boolean
  type?: 'string' | 'number' | 'date' | 'datetime' | 'boolean'
  format?: (row: R) => string | number | null | undefined
  align?: 'left' | 'right' | 'center'
  width?: string
  exportable?: boolean
}

const props = withDefaults(
  defineProps<{
    columns: DataTableColumn<Row>[]
    rows: Row[]
    total?: number
    page?: number
    limit?: number
    loading?: boolean
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
    rowKey?: string
    exportTitle: string
    exportSubtitle?: string
    exportOrientation?: 'portrait' | 'landscape'
    clickable?: boolean
    paginated?: boolean
    dense?: boolean
    emptyTitle?: string
  }>(),
  {
    total: 0,
    page: 1,
    limit: 20,
    loading: false,
    sortBy: undefined,
    sortOrder: 'ASC',
    rowKey: 'id',
    exportSubtitle: '',
    exportOrientation: 'landscape',
    clickable: false,
    paginated: true,
    dense: false,
    emptyTitle: '',
  },
)

const emit = defineEmits<{
  'update:page': [page: number]
  'update:limit': [limit: number]
  sort: [payload: { sortBy: string; sortOrder: 'ASC' | 'DESC' }]
  'row-click': [row: Row]
}>()

const { t, locale } = useI18n()
const api = useApi()
const ui = useUiStore()
const format = useFormat()
const exporting = ref<'excel' | 'pdf' | null>(null)

const LIMIT_OPTIONS = [10, 20, 50, 100]

const pageCount = computed(() => Math.max(1, Math.ceil((props.total || 0) / (props.limit || 1))))
const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.limit + 1))
const rangeEnd = computed(() => Math.min(props.total, props.page * props.limit))

const visiblePages = computed(() => {
  const pages: Array<number | '…'> = []
  const total = pageCount.value
  const current = props.page
  if (total <= 7) {
    for (let index = 1; index <= total; index += 1) pages.push(index)
    return pages
  }
  pages.push(1)
  if (current > 3) pages.push('…')
  for (let index = Math.max(2, current - 1); index <= Math.min(total - 1, current + 1); index += 1) pages.push(index)
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
})

const getValue = (row: Row, key: string): unknown => key.split('.').reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[part] : undefined), row)

const displayValue = (row: Row, column: DataTableColumn<Row>): string => {
  if (column.format) {
    const formatted = column.format(row)
    return formatted === null || formatted === undefined || formatted === '' ? '—' : String(formatted)
  }
  const raw = getValue(row, column.key)
  if (raw === null || raw === undefined || raw === '') return '—'
  if (column.type === 'date') return format.date(String(raw))
  if (column.type === 'datetime') return format.dateTime(String(raw))
  if (column.type === 'boolean') return raw ? t('common.yes') : t('common.no')
  if (column.type === 'number') return format.number(raw as number)
  return typeof raw === 'object' ? JSON.stringify(raw) : String(raw)
}

const exportValue = (row: Row, column: DataTableColumn<Row>): string | number | null => {
  if (column.format) {
    const formatted = column.format(row)
    return formatted === undefined ? null : formatted
  }
  const raw = getValue(row, column.key)
  if (raw === null || raw === undefined) return null
  if (column.type === 'number') return Number(raw)
  return displayValue(row, column)
}

const exportColumnType = (column: DataTableColumn<Row>): 'string' | 'number' => (column.type === 'number' && !column.format ? 'number' : 'string')

const exportTable = async (kind: 'excel' | 'pdf') => {
  const columns = props.columns.filter((column) => column.exportable !== false)
  if (columns.length === 0 || exporting.value) return
  exporting.value = kind
  const extension = kind === 'excel' ? 'xlsx' : 'pdf'
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const safeTitle = props.exportTitle.replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '_') || 'export'
  try {
    await api.download(
      `/export/${kind}`,
      {
        title: props.exportTitle,
        subtitle: props.exportSubtitle || undefined,
        columns: columns.map((column) => ({ key: column.key, label: column.label, type: exportColumnType(column) })),
        rows: props.rows.map((row) => Object.fromEntries(columns.map((column) => [column.key, exportValue(row, column)]))),
        locale: locale.value,
        orientation: props.exportOrientation,
      },
      `${safeTitle}_${stamp}.${extension}`,
    )
    ui.success('common.exportReady')
  } catch (error) {
    ui.toastError(error)
  } finally {
    exporting.value = null
  }
}

const toggleSort = (column: DataTableColumn<Row>) => {
  if (!column.sortable) return
  const nextOrder: 'ASC' | 'DESC' = props.sortBy === column.key && props.sortOrder === 'ASC' ? 'DESC' : 'ASC'
  emit('sort', { sortBy: column.key, sortOrder: nextOrder })
}

const goTo = (page: number | '…') => {
  if (page === '…' || page === props.page || page < 1 || page > pageCount.value) return
  emit('update:page', page)
}

const alignClass = (column: DataTableColumn<Row>) => (column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left')

const rowId = (row: Row, index: number): string => String(getValue(row, props.rowKey) ?? index)
</script>

<template>
  <div class="card overflow-hidden">
    <div class="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <div class="flex min-w-0 flex-1 flex-wrap items-end gap-2">
        <slot name="filters" />
      </div>
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <button type="button" class="btn-secondary btn-sm" :disabled="exporting !== null || rows.length === 0" :title="t('common.exportExcel')" @click="exportTable('excel')">
          <UiSpinner v-if="exporting === 'excel'" :size="14" />
          <UiIcon v-else name="fileDown" :size="15" />
          Excel
        </button>
        <button type="button" class="btn-secondary btn-sm" :disabled="exporting !== null || rows.length === 0" :title="t('common.exportPdf')" @click="exportTable('pdf')">
          <UiSpinner v-if="exporting === 'pdf'" :size="14" />
          <UiIcon v-else name="fileDown" :size="15" />
          PDF
        </button>
      </div>
    </div>

    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-100">
        <thead class="table-head">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="px-4 py-2.5 whitespace-nowrap select-none"
              :class="[alignClass(column), column.sortable ? 'cursor-pointer hover:text-slate-800' : '']"
              :style="column.width ? { width: column.width } : undefined"
              @click="toggleSort(column)"
            >
              <span class="inline-flex items-center gap-1">
                {{ column.label }}
                <UiIcon v-if="column.sortable && sortBy === column.key" :name="sortOrder === 'ASC' ? 'chevronUp' : 'chevronDown'" :size="12" class="text-brand" />
                <UiIcon v-else-if="column.sortable" name="chevronUpDown" :size="12" class="text-slate-300" />
              </span>
            </th>
            <th v-if="$slots.rowActions" scope="col" class="px-4 py-2.5 text-right">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 bg-white">
          <template v-if="loading && rows.length === 0">
            <tr v-for="index in 6" :key="`skeleton-${index}`">
              <td v-for="column in columns" :key="column.key" class="px-4" :class="dense ? 'py-2' : 'py-3'">
                <div class="skeleton h-4" :style="{ width: `${40 + ((index * 17 + column.key.length * 7) % 50)}%` }" />
              </td>
              <td v-if="$slots.rowActions" class="px-4 py-3"><div class="skeleton ml-auto h-4 w-16" /></td>
            </tr>
          </template>
          <tr v-else-if="rows.length === 0">
            <td :colspan="columns.length + ($slots.rowActions ? 1 : 0)">
              <UiEmptyState :title="emptyTitle" compact />
            </td>
          </tr>
          <tr
            v-for="(row, index) in rows"
            v-else
            :key="rowId(row, index)"
            class="transition-colors"
            :class="[clickable ? 'cursor-pointer hover:bg-brand/[0.04]' : 'hover:bg-slate-50/70', loading ? 'opacity-60' : '']"
            @click="clickable && emit('row-click', row)"
          >
            <td v-for="column in columns" :key="column.key" class="px-4 text-sm text-slate-700" :class="[alignClass(column), dense ? 'py-2' : 'py-3']">
              <slot :name="`cell-${column.key}`" :row="row" :value="getValue(row, column.key)" :display="displayValue(row, column)">
                <span :class="column.type === 'number' ? 'tabular-nums' : ''">{{ displayValue(row, column) }}</span>
              </slot>
            </td>
            <td v-if="$slots.rowActions" class="px-4 text-right" :class="dense ? 'py-2' : 'py-3'" @click.stop>
              <div class="flex items-center justify-end gap-1">
                <slot name="rowActions" :row="row" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="paginated" class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-600">
      <div class="flex items-center gap-3">
        <span class="tabular-nums">{{ t('common.showingRange', { start: rangeStart, end: rangeEnd, total }) }}</span>
        <label class="flex items-center gap-1.5">
          <span class="hidden sm:inline">{{ t('common.rowsPerPage') }}</span>
          <select class="input w-auto py-1 text-xs" :value="limit" @change="emit('update:limit', Number(($event.target as HTMLSelectElement).value))">
            <option v-for="option in LIMIT_OPTIONS" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
      </div>
      <div class="flex items-center gap-1">
        <button type="button" class="btn-icon p-1.5" :disabled="page <= 1" @click="goTo(page - 1)">
          <UiIcon name="chevronLeft" :size="14" />
        </button>
        <button
          v-for="(item, index) in visiblePages"
          :key="`${item}-${index}`"
          type="button"
          class="min-w-[28px] rounded-md px-2 py-1 text-xs font-medium tabular-nums transition"
          :class="item === page ? 'bg-brand text-white' : item === '…' ? 'text-slate-400 cursor-default' : 'text-slate-600 hover:bg-slate-200'"
          @click="goTo(item)"
        >
          {{ item }}
        </button>
        <button type="button" class="btn-icon p-1.5" :disabled="page >= pageCount" @click="goTo(page + 1)">
          <UiIcon name="chevronRight" :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>
