<script setup lang="ts">
import type { BadgeTone } from '~/utils/enums'

withDefaults(defineProps<{ label: string; value: string | number; hint?: string; icon?: string; tone?: BadgeTone; loading?: boolean; to?: string }>(), {
  hint: '',
  icon: '',
  tone: 'brand',
  loading: false,
  to: undefined,
})

const linkComponent = resolveComponent('NuxtLink')

const ICON_TONES: Record<BadgeTone, string> = {
  slate: 'bg-slate-100 text-slate-600',
  green: 'bg-green-50 text-green-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  orange: 'bg-orange-50 text-orange-600',
  red: 'bg-red-50 text-red-600',
  violet: 'bg-violet-50 text-violet-600',
  brand: 'bg-brand/10 text-brand',
}
</script>

<template>
  <component :is="to ? linkComponent : 'div'" :to="to" class="card card-body flex items-start gap-4 transition" :class="to ? 'hover:border-brand/40 hover:shadow-md' : ''">
    <span v-if="icon" class="rounded-xl p-2.5" :class="ICON_TONES[tone]">
      <UiIcon :name="icon" :size="22" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{{ label }}</p>
      <div v-if="loading" class="skeleton mt-2 h-7 w-24" />
      <p v-else class="mt-1 truncate text-2xl font-semibold tabular-nums text-slate-900">{{ value }}</p>
      <p v-if="hint" class="mt-1 text-xs text-slate-500">{{ hint }}</p>
      <slot />
    </div>
  </component>
</template>
