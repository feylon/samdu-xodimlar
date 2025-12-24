<script setup lang="ts">
withDefaults(defineProps<{ title: string; subtitle?: string; backTo?: string }>(), { subtitle: '', backTo: undefined })
</script>

<template>
  <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div class="flex items-start gap-3 min-w-0">
      <NuxtLink v-if="backTo" :to="backTo" class="btn-icon mt-0.5">
        <UiIcon name="arrowLeft" :size="18" />
      </NuxtLink>
      <div class="min-w-0">
        <h1 class="truncate text-xl font-semibold text-slate-900">{{ title }}</h1>
        <p v-if="subtitle" class="mt-0.5 text-sm text-slate-500">{{ subtitle }}</p>
        <slot name="meta" />
      </div>
    </div>
    <div v-if="$slots.default" class="flex flex-wrap items-center gap-2">
      <slot />
    </div>
  </div>
</template>
