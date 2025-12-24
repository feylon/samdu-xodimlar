<script setup lang="ts">
const props = withDefaults(defineProps<{ open: boolean; title?: string; subtitle?: string; width?: 'md' | 'lg' | 'xl' }>(), { title: '', subtitle: '', width: 'md' })
const emit = defineEmits<{ close: [] }>()

const WIDTH_CLASSES: Record<string, string> = { md: 'max-w-md', lg: 'max-w-xl', xl: 'max-w-3xl' }

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open) emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px]" @mousedown.self="emit('close')" />
    </Transition>
    <Transition name="slide-right">
      <aside v-if="open" class="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-pop" :class="WIDTH_CLASSES[width]" role="dialog" aria-modal="true">
        <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div class="min-w-0">
            <h3 class="truncate text-base font-semibold text-slate-900">{{ title }}</h3>
            <p v-if="subtitle" class="mt-0.5 text-xs text-slate-500">{{ subtitle }}</p>
          </div>
          <button type="button" class="btn-icon -mr-2 -mt-1" @click="emit('close')">
            <UiIcon name="close" :size="18" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto px-5 py-4">
          <slot />
        </div>
        <div v-if="$slots.footer" class="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <slot name="footer" />
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>
