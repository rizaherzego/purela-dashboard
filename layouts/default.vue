<script setup lang="ts">
const route = useRoute()
const pageTitle = computed(() => (route.meta?.title as string) ?? 'Dashboard')
</script>

<template>
  <div class="min-h-screen bg-cream-50 text-cream-700">
    <AppTopNav />
    <div class="px-8 py-8 max-w-screen-2xl mx-auto">
      <header class="flex items-baseline justify-between mb-8 pb-4 border-b border-cream-200">
        <h1 class="display text-2xl">{{ pageTitle }}</h1>
        <div class="text-xs text-cream-500">
          {{ new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
        </div>
      </header>
      <slot />
    </div>
  </div>
</template>
