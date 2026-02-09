<script setup lang="ts">
import type { OrganizationSettings } from '~/types/api'

definePageMeta({ title: 'nav.organization', middleware: 'role', roles: ['SUPERADMIN'] })

const { t } = useI18n()
const api = useApi()
const ui = useUiStore()
const organization = useOrganizationStore()
const { pending, run } = useAsyncAction()

const loading = ref(true)
const form = reactive({
  name: '',
  description: '',
  logoFileId: null as string | null,
  primaryColor: '#1d4ed8',
  currency: 'UZS',
  pointValue: 0,
  headTeamBonusRate: 0,
  headPointShareRate: 0,
  reportDeadlineHour: 17,
  reportMaxPoints: 5,
})

const apply = (settings: OrganizationSettings) => {
  Object.assign(form, {
    name: settings.name,
    description: settings.description ?? '',
    logoFileId: settings.logoFileId,
    primaryColor: settings.primaryColor,
    currency: settings.currency,
    pointValue: settings.pointValue,
    headTeamBonusRate: settings.headTeamBonusRate,
    headPointShareRate: settings.headPointShareRate,
    reportDeadlineHour: settings.reportDeadlineHour,
    reportMaxPoints: settings.reportMaxPoints,
  })
}

onMounted(async () => {
  try {
    apply(await organization.loadSettings())
  } catch (error) {
    ui.toastError(error)
  } finally {
    loading.value = false
  }
})

watch(
  () => form.primaryColor,
  (value) => organization.previewColor(value),
)

onBeforeUnmount(() => organization.applyBranding())

const colorError = computed(() => (!/^#[0-9a-fA-F]{6}$/.test(form.primaryColor) ? t('validation.hexColor') : ''))
const valid = computed(() => form.name.trim().length >= 2 && !colorError.value && form.currency.trim().length >= 3 && form.currency.trim().length <= 8)

const save = async () => {
  if (!valid.value) return
  const result = await run(
    () =>
      api.patch<OrganizationSettings>('/organization', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        logoFileId: form.logoFileId ?? '',
        primaryColor: form.primaryColor,
        currency: form.currency.trim().toUpperCase(),
        pointValue: Number(form.pointValue),
        headTeamBonusRate: Number(form.headTeamBonusRate),
        headPointShareRate: Number(form.headPointShareRate),
        reportDeadlineHour: Number(form.reportDeadlineHour),
        reportMaxPoints: Number(form.reportMaxPoints),
      }),
    { successKey: 'common.saved' },
  )
  if (result) {
    apply(result)
    await organization.loadSettings().catch(() => undefined)
  }
}

const PRESETS = ['#1d4ed8', '#0f766e', '#7c3aed', '#be123c', '#c2410c', '#0369a1', '#15803d', '#0f172a']
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <UiPageHeader :title="t('nav.organization')" :subtitle="t('settings.organizationSubtitle')" />

    <div v-if="loading" class="card card-body space-y-3">
      <div v-for="index in 6" :key="index" class="skeleton h-9" />
    </div>

    <form v-else class="space-y-5" @submit.prevent="save">
      <section class="card">
        <header class="border-b border-slate-100 px-5 py-3">
          <h3 class="text-sm font-semibold text-slate-900">{{ t('settings.branding') }}</h3>
        </header>
        <div class="grid gap-5 p-5 lg:grid-cols-3">
          <div class="space-y-4 lg:col-span-2">
            <UiFormField :label="t('settings.orgName')" required>
              <input v-model="form.name" type="text" class="input" maxlength="200" />
            </UiFormField>
            <UiFormField :label="t('common.description')">
              <textarea v-model="form.description" rows="3" class="input" maxlength="2000" />
            </UiFormField>
            <UiFormField :label="t('settings.primaryColor')" :error="colorError" :hint="t('settings.primaryColorHint')">
              <div class="flex flex-wrap items-center gap-3">
                <input v-model="form.primaryColor" type="color" class="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
                <input v-model="form.primaryColor" type="text" class="input w-32 font-mono uppercase" maxlength="7" />
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="preset in PRESETS" :key="preset" type="button" class="h-7 w-7 rounded-full ring-2 ring-offset-2 transition hover:scale-110" :class="form.primaryColor.toLowerCase() === preset ? 'ring-slate-800' : 'ring-transparent'" :style="{ backgroundColor: preset }" :title="preset" @click="form.primaryColor = preset" />
                </div>
              </div>
            </UiFormField>
            <UiFormField :label="t('settings.currency')" required :hint="t('settings.currencyHint')">
              <input v-model="form.currency" type="text" class="input w-32 font-mono uppercase" maxlength="8" />
            </UiFormField>
          </div>
          <div>
            <UiFormField :label="t('settings.logo')" :hint="t('settings.logoHint')">
              <UiFileUpload v-model="form.logoFileId" category="LOGO" accept="image/png,image/jpeg,image/webp,image/svg+xml" preview-size="lg" />
            </UiFormField>
            <div class="mt-4 rounded-xl border border-slate-200 p-4">
              <p class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t('settings.preview') }}</p>
              <div class="flex items-center gap-3">
                <span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">{{ organization.monogram }}</span>
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ form.name || organization.name }}</p>
                  <p class="text-xs text-slate-500">{{ t('app.tagline') }}</p>
                </div>
              </div>
              <div class="mt-3 flex gap-2">
                <span class="btn-primary btn-sm pointer-events-none">{{ t('common.save') }}</span>
                <span class="btn-secondary btn-sm pointer-events-none">{{ t('common.cancel') }}</span>
                <UiBadge tone="brand" :label="t('common.active')" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <header class="border-b border-slate-100 px-5 py-3">
          <h3 class="text-sm font-semibold text-slate-900">{{ t('settings.payrollCoefficients') }}</h3>
          <p class="text-xs text-slate-500">{{ t('settings.payrollCoefficientsHint') }}</p>
        </header>
        <div class="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <UiFormField :label="`${t('settings.pointValue')} (${form.currency})`" :hint="t('settings.pointValueHint')">
            <input v-model.number="form.pointValue" type="number" min="0" step="100" class="input tabular-nums" />
          </UiFormField>
          <UiFormField :label="`${t('settings.headTeamBonusRate')} (%)`" :hint="t('settings.headTeamBonusRateHint')">
            <input v-model.number="form.headTeamBonusRate" type="number" min="0" max="100" step="0.5" class="input tabular-nums" />
          </UiFormField>
          <UiFormField :label="`${t('settings.headPointShareRate')} (%)`" :hint="t('settings.headPointShareRateHint')">
            <input v-model.number="form.headPointShareRate" type="number" min="0" max="100" step="0.5" class="input tabular-nums" />
          </UiFormField>
          <UiFormField :label="t('settings.reportDeadlineHour')" :hint="t('settings.reportDeadlineHourHint')">
            <input v-model.number="form.reportDeadlineHour" type="number" min="0" max="23" class="input tabular-nums" />
          </UiFormField>
          <UiFormField :label="t('settings.reportMaxPoints')" :hint="t('settings.reportMaxPointsHint')">
            <input v-model.number="form.reportMaxPoints" type="number" min="0" max="100" class="input tabular-nums" />
          </UiFormField>
        </div>
      </section>

      <div class="flex items-center justify-end gap-2">
        <button type="submit" class="btn-primary" :disabled="!valid || pending">
          <UiSpinner v-if="pending" />
          {{ t('common.save') }}
        </button>
      </div>
    </form>
  </div>
</template>
