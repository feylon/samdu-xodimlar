export const useDebounceFn = <T extends (...args: never[]) => void>(fn: T, delay = 350) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
  onScopeDispose(() => {
    if (timer) clearTimeout(timer)
  })
  return debounced
}

export const useDebouncedRef = <T>(source: Ref<T>, delay = 350): Ref<T> => {
  const debounced = ref(source.value) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | null = null
  watch(source, (value) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = value
    }, delay)
  })
  onScopeDispose(() => {
    if (timer) clearTimeout(timer)
  })
  return debounced
}
