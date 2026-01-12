<script setup lang="ts">
import type { EmployeeDetail } from '~/types/api'
import type { PersonalFormModel } from '~/components/employees/PersonalForm.vue'
import type { AssignmentRow } from '~/components/employees/AssignmentsEditor.vue'
import { todayIso } from '~/utils/dates'

definePageMeta({ title: 'employees.onboard', middleware: 'role', roles: ['HR'] })

const { t } = useI18n()
const api = useApi()
const router = useRouter()
const { departments } = useDepartments()
const { pending, run } = useAsyncAction()

const credentials = reactive({ login: '', password: '' })
const showPassword = ref(false)
const personal = ref<PersonalFormModel>({
  fullName: '',
  pinfl: '',
  phone: '',
  email: '',
  position: '',
  baseSalary: null,
  hireDate: todayIso(),
  birthDate: '',
  address: '',
  photoFileId: null,
  passportFileIds: [],
})
const assignments = ref<AssignmentRow[]>([])
const personalForm = ref<{ valid: boolean } | null>(null)
const assignmentsEditor = ref<{ valid: boolean } | null>(null)

const loginError = computed(() => (credentials.login && !/^[a-zA-Z0-9._-]{3,64}$/.test(credentials.login) ? t('validation.login') : ''))
const passwordError = computed(() => (credentials.password && credentials.password.length < 8 ? t('validation.minLength', { n: 8 }) : ''))

const valid = computed(
  () =>
    credentials.login.length >= 3 &&
    !loginError.value &&
    credentials.password.length >= 8 &&
    Boolean(personalForm.value?.valid) &&
    (assignments.value.length === 0 || Boolean(assignmentsEditor.value?.valid)),
)

const generatePassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const values = new Uint32Array(12)
  crypto.getRandomValues(values)
  credentials.password = Array.from(values, (value) => alphabet[value % alphabet.length]).join('')
  showPassword.value = true
}

const submit = async () => {
  if (!valid.value) return
  const result = await run(
    () =>
      api.post<EmployeeDetail>('/employees', {
        login: credentials.login.trim(),
        password: credentials.password,
        fullName: personal.value.fullName.trim(),
        pinfl: personal.value.pinfl || undefined,
        phone: personal.value.phone.trim() || undefined,
        email: personal.value.email.trim() || undefined,
        position: personal.value.position.trim() || undefined,
        baseSalary: personal.value.baseSalary ?? undefined,
        photoFileId: personal.value.photoFileId ?? undefined,
        passportFileIds: personal.value.passportFileIds.length ? personal.value.passportFileIds : undefined,
        hireDate: personal.value.hireDate || undefined,
        birthDate: personal.value.birthDate || undefined,
        address: personal.value.address.trim() || undefined,
        assignments: assignments.value.length ? assignments.value.map((row) => ({ departmentId: row.departmentId, rate: row.rate })) : undefined,
      }),
    { successKey: 'employees.created' },
  )
  if (result) await router.push(`/employees/${result.id}`)
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <UiPageHeader :title="t('employees.onboard')" :subtitle="t('employees.onboardSubtitle')" back-to="/employees" />

    <form class="space-y-5" @submit.prevent="submit">
      <section class="card">
        <header class="border-b border-slate-100 px-5 py-3">
          <h3 class="text-sm font-semibold text-slate-900">{{ t('employees.credentials') }}</h3>
          <p class="text-xs text-slate-500">{{ t('employees.credentialsHint') }}</p>
        </header>
        <div class="grid gap-4 p-5 sm:grid-cols-2">
          <UiFormField :label="t('auth.loginField')" required :error="loginError">
            <input v-model="credentials.login" type="text" class="input" autocomplete="off" />
          </UiFormField>
          <UiFormField :label="t('auth.password')" required :error="passwordError">
            <div class="flex gap-2">
              <div class="relative flex-1">
                <input v-model="credentials.password" :type="showPassword ? 'text' : 'password'" class="input pr-10" autocomplete="new-password" />
                <button type="button" class="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700" @click="showPassword = !showPassword">
                  <UiIcon :name="showPassword ? 'eye' : 'lock'" :size="16" />
                </button>
              </div>
              <button type="button" class="btn-secondary" @click="generatePassword">
                <UiIcon name="sparkles" :size="16" />
              </button>
            </div>
          </UiFormField>
        </div>
      </section>

      <section class="card">
        <header class="border-b border-slate-100 px-5 py-3">
          <h3 class="text-sm font-semibold text-slate-900">{{ t('employees.personalData') }}</h3>
        </header>
        <div class="p-5">
          <EmployeesPersonalForm ref="personalForm" v-model="personal" />
        </div>
      </section>

      <section class="card">
        <header class="border-b border-slate-100 px-5 py-3">
          <h3 class="text-sm font-semibold text-slate-900">{{ t('employees.assignments') }}</h3>
          <p class="text-xs text-slate-500">{{ t('employees.assignmentsHint') }}</p>
        </header>
        <div class="p-5">
          <EmployeesAssignmentsEditor ref="assignmentsEditor" v-model="assignments" :departments="departments" />
        </div>
      </section>

      <div class="flex items-center justify-end gap-2">
        <NuxtLink to="/employees" class="btn-secondary">{{ t('common.cancel') }}</NuxtLink>
        <button type="submit" class="btn-primary" :disabled="!valid || pending">
          <UiSpinner v-if="pending" />
          <UiIcon v-else name="userPlus" :size="16" />
          {{ t('employees.create') }}
        </button>
      </div>
    </form>
  </div>
</template>
