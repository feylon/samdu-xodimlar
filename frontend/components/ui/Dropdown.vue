<script setup lang="ts">
withDefaults(defineProps<{ align?: 'left' | 'right'; width?: string }>(), { align: 'right', width: 'w-56' })

const open = ref(false)
const toggle = () => {
  open.value = !open.value
}
const close = () => {
  open.value = false
}

defineExpose({ close })
</script>

<template>
  <div v-click-outside="close" class="relative">
    <div @click="toggle">
      <slot name="trigger" :open="open" />
    </div>
    <Transition name="pop">
      <div v-if="open" class="absolute z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop" :class="[align === 'right' ? 'right-0' : 'left-0', width]" @click="close">
        <slot />
      </div>
    </Transition>
  </div>
</template>
