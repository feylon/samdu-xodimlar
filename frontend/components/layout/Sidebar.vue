<script setup lang="ts">
import { NAV_ITEMS } from '~/utils/navigation'

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()
const organization = useOrganizationStore()
const route = useRoute()

const items = computed(() => NAV_ITEMS.filter((item) => auth.hasRole(item.roles)))

const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(`${to}/`))

const logoFailed = ref(false)
</script>

<template>
  <div class="flex h-full flex-col bg-white">
    <div class="flex h-16 items-center gap-3 border-b border-slate-100 px-4" :class="ui.sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''">
      <img v-if="organization.logoUrl && !logoFailed" :src="organization.logoUrl" :alt="organization.name" class="h-9 w-9 shrink-0 rounded-lg object-contain" @error="logoFailed = true" />
      <span v-else class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">{{ organization.monogram }}</span>
      <div class="min-w-0" :class="ui.sidebarCollapsed ? 'lg:hidden' : ''">
        <p class="truncate text-sm font-semibold text-slate-900">{{ organization.name }}</p>
        <p class="truncate text-[11px] text-slate-500">{{ t('app.tagline') }}</p>
      </div>
    </div>
    <nav class="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="nav-link"
        :class="[isActive(item.to) ? 'nav-link-active' : '', ui.sidebarCollapsed ? 'lg:justify-center lg:px-2' : '']"
        :title="t(item.labelKey)"
        @click="ui.closeMobileSidebar()"
      >
        <UiIcon :name="item.icon" :size="20" />
        <span class="truncate" :class="ui.sidebarCollapsed ? 'lg:hidden' : ''">{{ t(item.labelKey) }}</span>
      </NuxtLink>
    </nav>
    <div class="hidden border-t border-slate-100 p-3 lg:block">
      <button type="button" class="nav-link w-full" :class="ui.sidebarCollapsed ? 'justify-center px-2' : ''" :title="t('common.toggleSidebar')" @click="ui.toggleSidebar()">
        <UiIcon :name="ui.sidebarCollapsed ? 'expand' : 'collapse'" :size="18" />
        <span :class="ui.sidebarCollapsed ? 'hidden' : ''">{{ t('common.collapse') }}</span>
      </button>
    </div>
  </div>
</template>
