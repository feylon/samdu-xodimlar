<script setup lang="ts">
const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const enumLabel = useEnumLabel()

const search = ref('')

const pageTitle = computed(() => {
  const key = route.meta.title
  return key ? t(key) : ''
})

const submitSearch = async () => {
  const value = search.value.trim()
  if (!value) return
  await router.push({ path: '/employees', query: { search: value } })
  search.value = ''
}

const canSearchEmployees = computed(() => auth.hasRole(['HR', 'SUPERADMIN', 'DEPARTMENT_HEAD']))

const logout = async () => {
  await auth.logout()
}

watch(
  () => route.fullPath,
  () => ui.closeMobileSidebar(),
)
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <aside
      class="fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 transition-[width] duration-200 lg:block"
      :class="ui.sidebarCollapsed ? 'w-[72px]' : 'w-64'"
    >
      <LayoutSidebar />
    </aside>

    <Transition name="fade">
      <div v-if="ui.mobileSidebarOpen" class="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" @click="ui.closeMobileSidebar()" />
    </Transition>
    <Transition name="slide-left">
      <aside v-if="ui.mobileSidebarOpen" class="fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 shadow-pop lg:hidden">
        <LayoutSidebar />
      </aside>
    </Transition>

    <div class="flex min-h-screen flex-col transition-[padding] duration-200" :class="ui.sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'">
      <header class="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        <button type="button" class="btn-icon lg:hidden" :aria-label="t('common.menu')" @click="ui.openMobileSidebar()">
          <UiIcon name="menu" :size="22" />
        </button>
        <h2 class="truncate text-base font-semibold text-slate-900">{{ pageTitle }}</h2>
        <div class="flex-1" />
        <form v-if="canSearchEmployees" class="relative hidden md:block" @submit.prevent="submitSearch">
          <UiIcon name="search" :size="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="search" type="search" class="input w-56 pl-9 py-1.5 lg:w-72" :placeholder="t('common.searchEmployees')" />
        </form>
        <LayoutLanguageSwitcher />
        <LayoutNotificationsMenu />
        <UiDropdown width="w-64">
          <template #trigger>
            <button type="button" class="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-slate-100">
              <UiAvatar :file-id="auth.user?.photoFileId" :name="auth.user?.fullName" size="sm" />
              <span class="hidden text-left sm:block">
                <span class="block max-w-[140px] truncate text-sm font-medium text-slate-800">{{ auth.user?.fullName }}</span>
                <span class="block text-[11px] text-slate-500">{{ enumLabel('UserRole', auth.user?.role) }}</span>
              </span>
              <UiIcon name="chevronDown" :size="14" class="hidden text-slate-400 sm:block" />
            </button>
          </template>
          <div class="border-b border-slate-100 px-4 py-3">
            <p class="truncate text-sm font-semibold text-slate-900">{{ auth.user?.fullName }}</p>
            <p class="truncate text-xs text-slate-500">@{{ auth.user?.login }}</p>
            <UiBadge class="mt-2" enum-name="UserRole" :value="auth.user?.role" />
          </div>
          <div class="p-1.5">
            <NuxtLink to="/profile" class="nav-link">
              <UiIcon name="user" :size="18" />
              {{ t('nav.profile') }}
            </NuxtLink>
            <NuxtLink to="/security" class="nav-link">
              <UiIcon name="shield" :size="18" />
              {{ t('nav.security') }}
            </NuxtLink>
            <button type="button" class="nav-link w-full text-red-600 hover:bg-red-50 hover:text-red-700" @click="logout">
              <UiIcon name="logout" :size="18" />
              {{ t('auth.logout') }}
            </button>
          </div>
        </UiDropdown>
      </header>

      <div v-if="auth.mustChangePassword && route.path !== '/profile'" class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 sm:px-6">
        <div class="flex flex-wrap items-center gap-2">
          <UiIcon name="warning" :size="16" />
          <span>{{ t('profile.mustChangePasswordBanner') }}</span>
          <NuxtLink to="/profile" class="font-semibold underline">{{ t('profile.changePassword') }}</NuxtLink>
        </div>
      </div>

      <main class="flex-1 px-4 py-5 sm:px-6 lg:px-8">
        <slot />
      </main>
    </div>
  </div>
</template>
