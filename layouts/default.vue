<script setup lang="ts">
const route = useRoute()
const pageTitle = computed(() => (route.meta?.title as string) ?? 'Dashboard')
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppTopNav />
    <div class="px-6 py-5 max-w-screen-2xl mx-auto">
      <div class="flex items-baseline justify-between mb-4">
        <h1 class="text-xl font-semibold text-gray-900">{{ pageTitle }}</h1>
        <div class="text-xs text-gray-400">
          {{ new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) }}
        </div>
      </div>
      <slot />
    </div>
  </div>
</template>
