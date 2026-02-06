<script setup lang="ts">
definePageMeta({ title: 'nav.profile' })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const auth = useAuthStore()
const format = useFormat()
const enumLabel = useEnumLabel()
const { pending, run } = useAsyncAction()

onMounted(() => {
  void auth.fetchMe().catch(() => undefined)
})

const fields = computed(() => {
  const user = auth.user
  if (!user) return []
  return [
    { label: t('auth.loginField'), value: `@${user.login}` },
    { label: t('common.role'), value: enumLabel('UserRole', user.role) },
    { label: t('employees.position'), value: user.position ?? '—' },
    { label: t('employees.pinfl'), value: user.pinfl ?? '—' },
    { label: t('employees.phone'), value: user.phone ?? '—' },
    { label: t('employees.email'), value: user.email ?? '—' },
    { label: t('employees.hireDate'), value: format.date(user.hireDate) },
    { label: t('employees.birthDate'), value: format.date(user.birthDate) },
    { label: t('employees.address'), value: user.address ?? '—' },
    { label: t('employees.lastLogin'), value: format.dateTime(user.lastLoginAt) },
  ]
})

const form = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const show = ref(false)
const mismatch = computed(() => form.confirmPassword.length > 0 && form.newPassword !== form.confirmPassword)
const tooShort = computed(() => form.newPassword.length > 0 && form.newPassword.length < 8)
const valid = computed(() => form.currentPassword.length >= 6 && form.newPassword.length >= 8 && form.newPassword === form.confirmPassword && form.newPassword !== form.currentPassword)

const submit = async () => {
  if (!valid.value) return
  const result = await run(() => api.post<{ success: boolean; terminatedSessions: number }>('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword }))
  if (result) {
    ui.success('profile.passwordChanged', result.terminatedSessions > 0 ? t('users.sessionsTerminatedCount', { count: result.terminatedSessions }) : undefined)
    Object.assign(form, { currentPassword: '', newPassword: '', confirmPassword: '' })
    auth.updateUser({ mustChangePassword: false })
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-5">
    <UiPageHeader :title="t('nav.profile')" :subtitle="t('profile.subtitle')" />

    <div v-if="auth.mustChangePassword" class="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <UiIcon name="warning" :size="18" class="mt-0.5 shrink-0" />
      <div>
        <p class="font-semibold">{{ t('profile.mustChangePasswordTitle') }}</p>
        <p class="mt-0.5 text-xs">{{ t('profile.mustChangePasswordBanner') }}</p>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-3">
      <div class="card card-body lg:col-span-2">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
          <UiAvatar :file-id="auth.user?.photoFileId" :name="auth.user?.fullName" size="xl" />
          <div class="min-w-0">
            <h2 class="text-xl font-semibold text-slate-900">{{ auth.user?.fullName }}</h2>
            <div class="mt-1 flex flex-wrap items-center gap-2">
              <UiBadge enum-name="UserRole" :value="auth.user?.role" size="sm" />
              <UiBadge enum-name="EmployeeStatus" :value="auth.user?.status" size="sm" />
            </div>
            <div class="mt-3 flex flex-wrap gap-1.5">
              <UiBadge v-for="assignment in auth.user?.assignments ?? []" :key="assignment.id" :label="`${assignment.departmentName} · ${assignment.rate}%${assignment.isHead ? ` · ${t('departments.head')}` : ''}`" tone="brand" :dot="false" size="sm" />
            </div>
          </div>
        </div>
        <dl class="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div v-for="field in fields" :key="field.label">
            <dt class="text-xs text-slate-500">{{ field.label }}</dt>
            <dd class="mt-0.5 text-sm font-medium text-slate-800 break-words">{{ field.value }}</dd>
          </div>
        </dl>
        <p class="mt-6 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <UiIcon name="info" :size="16" class="mt-0.5 shrink-0" />
          {{ t('profile.readOnlyNote') }}
        </p>
      </div>

      <form class="card card-body space-y-4 self-start" @submit.prevent="submit">
        <div>
          <h3 class="text-sm font-semibold text-slate-900">{{ t('profile.changePassword') }}</h3>
          <p class="mt-0.5 text-xs text-slate-500">{{ t('profile.changePasswordHint') }}</p>
        </div>
        <UiFormField :label="t('profile.currentPassword')" required>
          <input v-model="form.currentPassword" :type="show ? 'text' : 'password'" class="input" autocomplete="current-password" />
        </UiFormField>
        <UiFormField :label="t('users.newPassword')" required :error="tooShort ? t('validation.minLength', { n: 8 }) : ''">
          <input v-model="form.newPassword" :type="show ? 'text' : 'password'" class="input" autocomplete="new-password" />
        </UiFormField>
        <UiFormField :label="t('profile.confirmPassword')" required :error="mismatch ? t('validation.passwordMismatch') : ''">
          <input v-model="form.confirmPassword" :type="show ? 'text' : 'password'" class="input" autocomplete="new-password" />
        </UiFormField>
        <label class="flex items-center gap-2 text-xs text-slate-600">
          <input v-model="show" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
          {{ t('auth.showPassword') }}
        </label>
        <button type="submit" class="btn-primary w-full" :disabled="!valid || pending">
          <UiSpinner v-if="pending" />
          <UiIcon v-else name="key" :size="16" />
          {{ t('profile.changePassword') }}
        </button>
      </form>
    </div>
  </div>
</template>
