<script setup lang="ts">
export interface PersonalFormModel {
  fullName: string
  pinfl: string
  phone: string
  email: string
  position: string
  baseSalary: number | null
  hireDate: string
  birthDate: string
  address: string
  photoFileId: string | null
  passportFileIds: string[]
}

const props = withDefaults(defineProps<{ modelValue: PersonalFormModel; showFiles?: boolean; showSalary?: boolean }>(), { showFiles: true, showSalary: true })
const emit = defineEmits<{ 'update:modelValue': [value: PersonalFormModel] }>()

const { t } = useI18n()
const organization = useOrganizationStore()

const update = <K extends keyof PersonalFormModel>(key: K, value: PersonalFormModel[K]) => emit('update:modelValue', { ...props.modelValue, [key]: value })

const pinflError = computed(() => (props.modelValue.pinfl && !/^\d{14}$/.test(props.modelValue.pinfl) ? t('validation.pinfl') : ''))
const emailError = computed(() => (props.modelValue.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.modelValue.email) ? t('validation.email') : ''))
const nameError = computed(() => (props.modelValue.fullName.trim().length > 0 && props.modelValue.fullName.trim().length < 3 ? t('validation.minLength', { n: 3 }) : ''))

defineExpose({ valid: computed(() => !pinflError.value && !emailError.value && !nameError.value && props.modelValue.fullName.trim().length >= 3) })
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <UiFormField :label="t('employees.fullName')" required :error="nameError" class="sm:col-span-2">
      <input :value="modelValue.fullName" type="text" class="input" @input="update('fullName', ($event.target as HTMLInputElement).value)" />
    </UiFormField>
    <UiFormField :label="t('employees.pinfl')" :error="pinflError" :hint="t('employees.pinflHint')">
      <input :value="modelValue.pinfl" type="text" inputmode="numeric" maxlength="14" class="input tabular-nums" @input="update('pinfl', ($event.target as HTMLInputElement).value.replace(/\D/g, ''))" />
    </UiFormField>
    <UiFormField :label="t('employees.position')">
      <input :value="modelValue.position" type="text" class="input" @input="update('position', ($event.target as HTMLInputElement).value)" />
    </UiFormField>
    <UiFormField :label="t('employees.phone')">
      <input :value="modelValue.phone" type="tel" class="input" placeholder="+998" @input="update('phone', ($event.target as HTMLInputElement).value)" />
    </UiFormField>
    <UiFormField :label="t('employees.email')" :error="emailError">
      <input :value="modelValue.email" type="email" class="input" @input="update('email', ($event.target as HTMLInputElement).value)" />
    </UiFormField>
    <UiFormField v-if="showSalary" :label="`${t('employees.baseSalary')} (${organization.currency})`">
      <input :value="modelValue.baseSalary ?? ''" type="number" min="0" step="1000" class="input tabular-nums" @input="update('baseSalary', ($event.target as HTMLInputElement).value === '' ? null : Number(($event.target as HTMLInputElement).value))" />
    </UiFormField>
    <UiFormField :label="t('employees.hireDate')">
      <input :value="modelValue.hireDate" type="date" class="input" @input="update('hireDate', ($event.target as HTMLInputElement).value)" />
    </UiFormField>
    <UiFormField :label="t('employees.birthDate')">
      <input :value="modelValue.birthDate" type="date" class="input" @input="update('birthDate', ($event.target as HTMLInputElement).value)" />
    </UiFormField>
    <UiFormField :label="t('employees.address')" class="sm:col-span-2">
      <input :value="modelValue.address" type="text" class="input" @input="update('address', ($event.target as HTMLInputElement).value)" />
    </UiFormField>
    <template v-if="showFiles">
      <UiFormField :label="t('employees.photo')">
        <UiFileUpload :model-value="modelValue.photoFileId" category="PHOTO" accept="image/jpeg,image/png,image/webp" @update:model-value="update('photoFileId', ($event as string | null) ?? null)" />
      </UiFormField>
      <UiFormField :label="t('employees.passportScans')" :hint="t('employees.passportHint')">
        <UiFileUpload :model-value="modelValue.passportFileIds" category="PASSPORT" accept="image/jpeg,image/png,image/webp,application/pdf" multiple preview-size="sm" @update:model-value="update('passportFileIds', ($event as string[]) ?? [])" />
      </UiFormField>
    </template>
  </div>
</template>
