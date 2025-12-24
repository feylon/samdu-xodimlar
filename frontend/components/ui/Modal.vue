<script setup lang="ts">
const props = withDefaults(defineProps<{ open: boolean; title?: string; subtitle?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; closable?: boolean }>(), {
  title: '',
  subtitle: '',
  size: 'md',
  closable: true,
})

const emit = defineEmits<{ close: [] }>()

const SIZE_CLASSES: Record<string, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open && props.closable) emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center" @mousedown.self="closable && emit('close')">
        <Transition name="pop" appear>
          <div class="card w-full max-h-[92vh] flex flex-col overflow-hidden" :class="SIZE_CLASSES[size]" role="dialog" aria-modal="true">
            <div v-if="title || closable" class="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
                <p v-if="subtitle" class="mt-0.5 text-xs text-slate-500">{{ subtitle }}</p>
              </div>
              <button v-if="closable" type="button" class="btn-icon -mr-2 -mt-1" @click="emit('close')">
                <UiIcon name="close" :size="18" />
              </button>
            </div>
            <div class="overflow-y-auto px-5 py-4">
              <slot />
            </div>
            <div v-if="$slots.footer" class="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
