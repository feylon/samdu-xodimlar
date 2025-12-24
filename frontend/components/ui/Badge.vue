<script setup lang="ts">
import { TONE_CLASSES, TONE_DOT_CLASSES, toneFor, type BadgeTone } from '~/utils/enums'

const props = withDefaults(
  defineProps<{
    value?: string | boolean | null
    enumName?: string
    tone?: BadgeTone
    label?: string
    dot?: boolean
    size?: 'xs' | 'sm'
  }>(),
  { value: null, enumName: undefined, tone: undefined, label: undefined, dot: true, size: 'xs' },
)

const enumLabel = useEnumLabel()

const resolvedTone = computed<BadgeTone>(() => props.tone ?? (props.enumName ? toneFor(props.enumName, props.value) : 'slate'))

const text = computed(() => {
  if (props.label !== undefined) return props.label
  if (props.enumName && props.value !== null && props.value !== undefined) return enumLabel(props.enumName, String(props.value))
  return props.value === null || props.value === undefined ? '—' : String(props.value)
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset whitespace-nowrap"
    :class="[TONE_CLASSES[resolvedTone], size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs']"
  >
    <span v-if="dot" class="h-1.5 w-1.5 rounded-full" :class="TONE_DOT_CLASSES[resolvedTone]" />
    {{ text }}
  </span>
</template>
