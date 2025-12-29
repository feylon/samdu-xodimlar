<script setup lang="ts">
const organization = useOrganizationStore()
const logoFailed = ref(false)
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
    <div class="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
    <div class="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-brand/10 blur-3xl" />
    <div class="absolute right-4 top-4">
      <LayoutLanguageSwitcher />
    </div>
    <div class="relative w-full max-w-md">
      <div class="mb-6 flex flex-col items-center text-center">
        <img v-if="organization.logoUrl && !logoFailed" :src="organization.logoUrl" :alt="organization.name" class="h-16 w-16 rounded-2xl object-contain shadow-card" @error="logoFailed = true" />
        <span v-else class="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-xl font-bold text-white shadow-card">{{ organization.monogram }}</span>
        <h1 class="mt-4 text-2xl font-semibold text-slate-900">{{ organization.name }}</h1>
        <p v-if="organization.branding.description" class="mt-1 max-w-sm text-sm text-slate-500">{{ organization.branding.description }}</p>
      </div>
      <div class="card p-6 sm:p-8">
        <slot />
      </div>
    </div>
  </div>
</template>
