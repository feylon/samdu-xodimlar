import type { Department } from '~/types/api'

export const useDepartments = (options: { includeInactive?: boolean; immediate?: boolean } = {}) => {
  const api = useApi()
  const ui = useUiStore()
  const departments = ref<Department[]>([])
  const loading = ref(false)

  const load = async () => {
    loading.value = true
    try {
      departments.value = await api.get<Department[]>('/departments', options.includeInactive ? { includeInactive: 'true' } : undefined)
    } catch (error) {
      ui.toastError(error)
    } finally {
      loading.value = false
    }
  }

  const selectOptions = computed(() => departments.value.map((department) => ({ value: department.id, label: `${department.name} (${department.code})` })))

  const nameOf = (id: string | null | undefined) => departments.value.find((department) => department.id === id)?.name ?? ''

  if (options.immediate !== false) onMounted(load)

  return { departments, loading, load, selectOptions, nameOf }
}
