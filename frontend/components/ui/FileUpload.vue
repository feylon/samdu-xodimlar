<script setup lang="ts">
import type { FileCategory } from '~/composables/useFiles'

interface UploadState {
  key: string
  name: string
  progress: number
  error: string | null
}

const props = withDefaults(
  defineProps<{
    modelValue: string | string[] | null
    category: FileCategory
    multiple?: boolean
    accept?: string
    ownerUserId?: string
    maxFiles?: number
    previewSize?: 'sm' | 'md' | 'lg'
  }>(),
  { multiple: false, accept: 'image/jpeg,image/png,image/webp', ownerUserId: undefined, maxFiles: 10, previewSize: 'md' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | string[] | null] }>()

const { t } = useI18n()
const files = useFiles()
const ui = useUiStore()
const auth = useAuthStore()
const inputRef = ref<HTMLInputElement | null>(null)
const uploads = ref<UploadState[]>([])
const dragging = ref(false)

const ids = computed<string[]>(() => {
  if (!props.modelValue) return []
  return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]
})

const isPrivateCategory = computed(() => props.category === 'PASSPORT' || props.category === 'DOCUMENT')

const previewUrl = (id: string) => files.contentUrl(id, isPrivateCategory.value)

const emitIds = (next: string[]) => {
  if (props.multiple) emit('update:modelValue', next)
  else emit('update:modelValue', next[0] ?? null)
}

const handleFiles = async (list: FileList | null) => {
  if (!list || list.length === 0) return
  const selected = Array.from(list)
  const allowed = props.multiple ? selected.slice(0, Math.max(0, props.maxFiles - ids.value.length)) : selected.slice(0, 1)
  const results: string[] = []
  for (const file of allowed) {
    const key = `${file.name}-${Date.now()}-${Math.random()}`
    const state: UploadState = { key, name: file.name, progress: 0, error: null }
    uploads.value = [...uploads.value, state]
    try {
      const uploaded = await files.upload(file, props.category, (ratio) => {
        const target = uploads.value.find((item) => item.key === key)
        if (target) target.progress = ratio
      }, props.ownerUserId)
      results.push(uploaded.id)
      uploads.value = uploads.value.filter((item) => item.key !== key)
    } catch (error) {
      const described = ui.describeError(error)
      const target = uploads.value.find((item) => item.key === key)
      if (target) target.error = described.title
      ui.toastError(error)
    }
  }
  if (results.length) emitIds(props.multiple ? [...ids.value, ...results] : results)
  if (inputRef.value) inputRef.value.value = ''
}

const remove = (id: string) => emitIds(ids.value.filter((item) => item !== id))

const onDrop = (event: DragEvent) => {
  dragging.value = false
  void handleFiles(event.dataTransfer?.files ?? null)
}

const PREVIEW_CLASSES: Record<string, string> = { sm: 'h-16 w-16', md: 'h-24 w-24', lg: 'h-32 w-32' }

const isImageId = (id: string) => Boolean(id) && (props.accept.includes('image') || props.category === 'PHOTO' || props.category === 'LOGO')

const openFile = (id: string) => {
  const url = files.contentUrl(id, isPrivateCategory.value || !auth.accessToken)
  if (url) window.open(url, '_blank', 'noopener')
}
</script>

<template>
  <div>
    <div class="flex flex-wrap gap-3">
      <div v-for="id in ids" :key="id" class="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50" :class="PREVIEW_CLASSES[previewSize]">
        <img v-if="isImageId(id)" :src="previewUrl(id) ?? ''" class="h-full w-full cursor-zoom-in object-cover" :alt="id" @click="openFile(id)" />
        <button v-else type="button" class="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-500" @click="openFile(id)">
          <UiIcon name="paperclip" :size="22" />
          <span class="text-[10px]">{{ t('common.open') }}</span>
        </button>
        <button type="button" class="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-slate-600 shadow opacity-0 transition group-hover:opacity-100 hover:text-red-600" @click="remove(id)">
          <UiIcon name="close" :size="12" />
        </button>
      </div>
      <div v-for="upload in uploads" :key="upload.key" class="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white p-2 text-center" :class="PREVIEW_CLASSES[previewSize]">
        <template v-if="upload.error">
          <UiIcon name="xCircle" :size="18" class="text-red-500" />
          <span class="line-clamp-2 text-[10px] text-red-600">{{ upload.error }}</span>
        </template>
        <template v-else>
          <UiSpinner :size="18" class="text-brand" />
          <span class="text-[10px] tabular-nums text-slate-500">{{ Math.round(upload.progress * 100) }}%</span>
        </template>
      </div>
      <label
        v-if="multiple || ids.length === 0"
        class="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-2 text-center text-slate-500 transition hover:border-brand hover:text-brand"
        :class="[PREVIEW_CLASSES[previewSize], dragging ? 'border-brand bg-brand/5 text-brand' : 'border-slate-300']"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <UiIcon name="upload" :size="20" />
        <span class="text-[10px] leading-tight">{{ t('common.upload') }}</span>
        <input ref="inputRef" type="file" class="hidden" :accept="accept" :multiple="multiple" @change="handleFiles(($event.target as HTMLInputElement).files)" />
      </label>
    </div>
  </div>
</template>
