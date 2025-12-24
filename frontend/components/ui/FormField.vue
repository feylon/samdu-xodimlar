<script setup lang="ts">
withDefaults(defineProps<{ label?: string; error?: string; hint?: string; required?: boolean; inline?: boolean }>(), {
  label: '',
  error: '',
  hint: '',
  required: false,
  inline: false,
})
</script>

<template>
  <div :class="inline ? 'flex items-center gap-3' : ''">
    <label v-if="label" class="label" :class="inline ? 'mb-0 shrink-0' : ''">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <div class="min-w-0 flex-1">
      <slot />
      <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
      <p v-else-if="hint" class="mt-1 text-xs text-slate-500">{{ hint }}</p>
    </div>
  </div>
</template>
