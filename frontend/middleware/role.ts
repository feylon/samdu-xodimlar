export default defineNuxtRouteMiddleware((to) => {
  const roles = to.meta.roles
  if (!roles || roles.length === 0) return
  const auth = useAuthStore()
  if (!auth.user) return
  if (!roles.includes(auth.user.role)) {
    const ui = useUiStore()
    const { t } = useTranslate()
    ui.error(t('errors.ACCESS_FORBIDDEN_ROLE'))
    return navigateTo('/')
  }
})
