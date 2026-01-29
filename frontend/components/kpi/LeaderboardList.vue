<script setup lang="ts">
import type { LeaderboardEntry } from '~/types/api'

const props = defineProps<{ entries: LeaderboardEntry[] }>()
const { t } = useI18n()

const max = computed(() => Math.max(1, ...props.entries.map((entry) => entry.points.total)))
</script>

<template>
  <ul v-if="entries.length" class="space-y-2">
    <li v-for="(entry, index) in entries" :key="entry.userId" class="flex items-center gap-3">
      <span class="w-6 text-center text-xs font-semibold tabular-nums" :class="index < 3 ? 'text-brand' : 'text-slate-400'">{{ index + 1 }}</span>
      <UiAvatar :file-id="entry.photoFileId" :name="entry.fullName" size="sm" />
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <p class="truncate text-sm font-medium text-slate-800">{{ entry.fullName }}</p>
          <span class="text-sm font-semibold tabular-nums text-slate-900">{{ entry.points.total }}</span>
        </div>
        <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div class="h-full rounded-full bg-brand transition-all duration-500" :style="{ width: `${Math.max(2, (entry.points.total / max) * 100)}%` }" />
        </div>
        <p class="mt-1 truncate text-[11px] text-slate-500">{{ entry.position || '—' }} · {{ t('kpi.tasksVerifiedOf', { verified: entry.tasks.verified, assigned: entry.tasks.assigned }) }}</p>
      </div>
    </li>
  </ul>
  <UiEmptyState v-else compact :title="t('kpi.noLeaderboard')" icon="trophy" />
</template>
