<script setup lang="ts">
import type { EmployeeListItem, Paginated, PublicUser } from '~/types/api'

const props = withDefaults(defineProps<{ modelValue: string | null; source?: 'employees' | 'users'; placeholder?: string; initialLabel?: string; departmentId?: string }>(), {
  source: 'employees',
  placeholder: '',
  initialLabel: '',
  departmentId: undefined,
})
const emit = defineEmits<{ 'update:modelValue': [value: string | null]; select: [user: PublicUser | null] }>()

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()

const query = ref('')
const results = ref<PublicUser[]>([])
const open = ref(false)
const loading = ref(false)
const selectedLabel = ref(props.initialLabel)

watch(
  () => props.initialLabel,
  (value) => {
    selectedLabel.value = value
  },
)

const search = useDebounceFn(async (value: string) => {
  if (value.trim().length < 2) {
    results.value = []
    return
  }
  loading.value = true
  try {
    if (props.source === 'users') {
      results.value = await api.get<PublicUser[]>('/users/lookup', { query: value.trim() })
    } else {
      const response = await api.get<Paginated<EmployeeListItem>>('/employees', { search: value.trim(), limit: 10, departmentId: props.departmentId })
      results.value = response.items
    }
    open.value = true
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}, 300)

watch(query, (value) => search(value))

const choose = (user: PublicUser) => {
  selectedLabel.value = `${user.fullName} (@${user.login})`
  query.value = ''
  open.value = false
  results.value = []
  emit('update:modelValue', user.id)
  emit('select', user)
}

const clear = () => {
  selectedLabel.value = ''
  emit('update:modelValue', null)
  emit('select', null)
}
</script>

<template>
  <div v-click-outside="() => (open = false)" class="relative">
    <div v-if="modelValue && selectedLabel" class="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <span class="truncate text-slate-800">{{ selectedLabel }}</span>
      <button type="button" class="text-slate-400 hover:text-red-600" @click="clear">
        <UiIcon name="close" :size="14" />
      </button>
    </div>
    <div v-else class="relative">
      <UiIcon name="search" :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input v-model="query" type="text" class="input pl-9" :placeholder="placeholder || t('common.searchByNameOrLogin')" @focus="results.length && (open = true)" />
      <UiSpinner v-if="loading" :size="14" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
    <Transition name="pop">
      <ul v-if="open && results.length" class="absolute z-40 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-pop">
        <li v-for="user in results" :key="user.id">
          <button type="button" class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50" @click="choose(user)">
            <UiAvatar :file-id="user.photoFileId" :name="user.fullName" size="xs" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm text-slate-800">{{ user.fullName }}</span>
              <span class="block truncate text-xs text-slate-500">@{{ user.login }} · {{ user.position || '—' }}</span>
            </span>
            <UiBadge enum-name="UserRole" :value="user.role" :dot="false" />
          </button>
        </li>
      </ul>
      <div v-else-if="open && query.trim().length >= 2 && !loading" class="absolute z-40 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-pop">
        {{ t('common.noResults') }}
      </div>
    </Transition>
  </div>
</template>
