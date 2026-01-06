<script setup lang="ts">
definePageMeta({ layout: 'auth', title: 'auth.login' })

const { t } = useI18n()
const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()

const form = reactive({ login: '', password: '' })
const showPassword = ref(false)
const pending = ref(false)
const errorMessage = ref('')

const submit = async () => {
  errorMessage.value = ''
  if (form.login.trim().length < 3 || form.password.length < 6) {
    errorMessage.value = t('auth.validation')
    return
  }
  pending.value = true
  try {
    await auth.login(form.login.trim(), form.password)
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/'
    await router.replace(redirect)
  } catch (error) {
    const described = ui.describeError(error)
    errorMessage.value = described.message ? `${described.title}: ${described.message}` : described.title
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <form class="space-y-5" @submit.prevent="submit">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">{{ t('auth.welcome') }}</h2>
      <p class="mt-1 text-sm text-slate-500">{{ t('auth.subtitle') }}</p>
    </div>

    <Transition name="pop">
      <div v-if="errorMessage" class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
        <UiIcon name="xCircle" :size="16" class="mt-0.5 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>
    </Transition>

    <UiFormField :label="t('auth.loginField')" required>
      <input v-model="form.login" type="text" class="input" autocomplete="username" autofocus :placeholder="t('auth.loginPlaceholder')" />
    </UiFormField>

    <UiFormField :label="t('auth.password')" required>
      <div class="relative">
        <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="input pr-10" autocomplete="current-password" :placeholder="t('auth.passwordPlaceholder')" />
        <button type="button" class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700" :aria-label="t('auth.togglePassword')" @click="showPassword = !showPassword">
          <UiIcon :name="showPassword ? 'eye' : 'lock'" :size="16" />
        </button>
      </div>
    </UiFormField>

    <button type="submit" class="btn-primary w-full py-2.5" :disabled="pending">
      <UiSpinner v-if="pending" />
      {{ t('auth.signIn') }}
    </button>

    <p class="text-center text-xs text-slate-400">{{ t('auth.footer') }}</p>
  </form>
</template>
