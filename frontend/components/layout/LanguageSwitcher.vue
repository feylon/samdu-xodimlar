<script setup lang="ts">
const { locale, setLocale } = useI18n()

const LOCALES = [
  { code: 'uz', label: 'UZ' },
  { code: 'ru', label: 'RU' },
] as const

const switchTo = async (code: 'uz' | 'ru') => {
  if (code === locale.value) return
  await setLocale(code)
}
</script>

<template>
  <div class="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
    <button
      v-for="item in LOCALES"
      :key="item.code"
      type="button"
      class="rounded-md px-2.5 py-1 transition"
      :class="locale === item.code ? 'bg-brand text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'"
      @click="switchTo(item.code)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
