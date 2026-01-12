<script setup lang="ts">
import type { PublicUser } from '~/types/api'

const props = defineProps<{ open: boolean; user: PublicUser }>()
const emit = defineEmits<{ close: []; saved: [user: PublicUser & { terminatedSessions: number }] }>()

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const { pending, run } = useAsyncAction()

const form = reactive({ login: '', password: '', mustChangePassword: true, terminateSessions: true })
const showPassword = ref(false)

watch(
  () => props.open,
  (open) => {
    if (open) Object.assign(form, { login: props.user.login, password: '', mustChangePassword: true, terminateSessions: true })
  },
)

const loginChanged = computed(() => form.login.trim() !== props.user.login)
const loginError = computed(() => (form.login && !/^[a-zA-Z0-9._-]{3,64}$/.test(form.login) ? t('validation.login') : ''))
const passwordError = computed(() => (form.password && form.password.length < 8 ? t('validation.minLength', { n: 8 }) : ''))
const valid = computed(() => !loginError.value && !passwordError.value && form.login.trim().length >= 3)

const generatePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const values = new Uint32Array(12)
  crypto.getRandomValues(values)
  form.password = Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
  showPassword.value = true
}

const submit = async () => {
  if (!valid.value) return
  const result = await run(
    () =>
      api.patch<PublicUser & { terminatedSessions: number }>(`/users/${props.user.id}/credentials`, {
        login: loginChanged.value ? form.login.trim() : undefined,
        password: form.password || undefined,
        mustChangePassword: form.mustChangePassword,
        terminateSessions: form.terminateSessions,
      }),
    { successKey: 'users.credentialsUpdated' },
  )
  if (result) {
    if (result.terminatedSessions > 0) ui.info('users.sessionsTerminated', t('users.sessionsTerminatedCount', { count: result.terminatedSessions }))
    emit('saved', result)
  }
}
</script>

<template>
  <UiModal :open="open" :title="t('users.resetCredentials')" :subtitle="user.fullName" @close="emit('close')">
    <div class="space-y-4">
      <UiFormField :label="t('auth.loginField')" :error="loginError">
        <input v-model="form.login" type="text" class="input" autocomplete="off" />
      </UiFormField>
      <UiFormField :label="t('users.newPassword')" :error="passwordError" :hint="t('users.leaveBlankToKeep')">
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="input pr-10" autocomplete="new-password" />
            <button type="button" class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700" @click="showPassword = !showPassword">
              <UiIcon :name="showPassword ? 'eye' : 'lock'" :size="16" />
            </button>
          </div>
          <button type="button" class="btn-secondary" @click="generatePassword">
            <UiIcon name="sparkles" :size="16" />
            {{ t('users.generate') }}
          </button>
        </div>
      </UiFormField>
      <label class="flex items-center gap-2 text-sm text-slate-700">
        <input v-model="form.mustChangePassword" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
        {{ t('users.mustChangePassword') }}
      </label>
      <label class="flex items-center gap-2 text-sm text-slate-700">
        <input v-model="form.terminateSessions" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
        {{ t('users.terminateSessions') }}
      </label>
    </div>
    <template #footer>
      <button type="button" class="btn-secondary" @click="emit('close')">{{ t('common.cancel') }}</button>
      <button type="button" class="btn-primary" :disabled="!valid || pending" @click="submit">
        <UiSpinner v-if="pending" />
        <UiIcon v-else name="key" :size="16" />
        {{ t('common.save') }}
      </button>
    </template>
  </UiModal>
</template>
