export const useAsyncAction = () => {
  const ui = useUiStore()
  const pending = ref(false)

  const run = async <T>(action: () => Promise<T>, options: { successKey?: string; silent?: boolean } = {}): Promise<T | undefined> => {
    pending.value = true
    try {
      const result = await action()
      if (options.successKey) ui.success(options.successKey)
      return result
    } catch (error) {
      if (!options.silent) ui.toastError(error)
      return undefined
    } finally {
      pending.value = false
    }
  }

  return { pending, run }
}
