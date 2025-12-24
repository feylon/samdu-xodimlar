<script setup lang="ts">
const props = withDefaults(defineProps<{ fileId?: string | null; name?: string | null; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; withToken?: boolean }>(), {
  fileId: null,
  name: '',
  size: 'sm',
  withToken: false,
})

const files = useFiles()
const failed = ref(false)

watch(
  () => props.fileId,
  () => {
    failed.value = false
  },
)

const src = computed(() => (failed.value ? null : files.contentUrl(props.fileId, props.withToken)))

const initials = computed(() => {
  const parts = (props.name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
})

const SIZE_CLASSES: Record<string, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-24 w-24 text-2xl',
}
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand/10 font-semibold text-brand ring-1 ring-inset ring-brand/10"
    :class="SIZE_CLASSES[size]"
  >
    <img v-if="src" :src="src" :alt="name ?? ''" class="h-full w-full object-cover" @error="failed = true" />
    <span v-else>{{ initials }}</span>
  </span>
</template>
