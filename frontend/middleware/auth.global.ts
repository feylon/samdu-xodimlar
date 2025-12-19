export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  if (to.path === '/login') {
    if (auth.accessToken) return navigateTo('/')
    return
  }
  if (!auth.accessToken) {
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} })
  }
})
