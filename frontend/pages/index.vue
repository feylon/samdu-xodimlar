<script setup lang="ts">
import type { DashboardPayload } from '~/types/api'

definePageMeta({ title: 'nav.dashboard' })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const auth = useAuthStore()

const data = ref<DashboardPayload | null>(null)
const loading = ref(true)

const load = async () => {
  loading.value = true
  try {
    data.value = await api.get<DashboardPayload>('/dashboard')
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <UiPageHeader :title="t('dashboard.greeting', { name: auth.user?.fullName ?? '' })" :subtitle="t('dashboard.subtitle')">
      <button type="button" class="btn-secondary btn-sm" :disabled="loading" @click="load">
        <UiSpinner v-if="loading" :size="14" />
        <UiIcon v-else name="refresh" :size="15" />
        {{ t('common.refresh') }}
      </button>
    </UiPageHeader>

    <div v-if="loading && !data" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="index in 8" :key="index" class="card card-body">
        <div class="skeleton h-3 w-24" />
        <div class="skeleton mt-3 h-7 w-20" />
      </div>
    </div>

    <template v-else-if="data">
      <DashboardSuperadmin v-if="data.role === 'SUPERADMIN'" :data="data" />
      <DashboardHr v-else-if="data.role === 'HR'" :data="data" />
      <DashboardHead v-else-if="data.role === 'DEPARTMENT_HEAD'" :data="data" />
      <DashboardEmployee v-else :data="data" />
    </template>

    <UiEmptyState v-else :title="t('dashboard.unavailable')" />
  </div>
</template>
