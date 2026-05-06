<script setup lang="ts">
const route = useRoute()

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/': 'Overview',
    '/sales': 'Sales',
    '/revenue': 'Revenue',
    '/inventory': 'Inventory',
    '/profitability': 'Profitability',
  }
  return titles[route.path] ?? 'Dashboard'
})
</script>

<template>
  <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
    <h1 class="text-lg font-semibold text-gray-900">{{ pageTitle }}</h1>
    <div class="text-sm text-gray-500">
      {{ new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
    </div>
  </header>
</template>
