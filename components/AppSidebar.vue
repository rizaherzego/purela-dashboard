<script setup lang="ts">
const route = useRoute()

const navItems = [
  { label: 'Overview', icon: 'lucide:layout-dashboard', to: '/' },
  { label: 'Sales', icon: 'lucide:shopping-cart', to: '/sales' },
  { label: 'Revenue', icon: 'lucide:trending-up', to: '/revenue' },
  { label: 'Inventory', icon: 'lucide:package', to: '/inventory' },
  { label: 'Profitability', icon: 'lucide:bar-chart-2', to: '/profitability' },
]
</script>

<template>
  <aside class="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col">
    <div class="h-16 flex items-center px-6 border-b border-gray-200">
      <span class="text-xl font-bold text-gray-900">Purela</span>
      <span class="ml-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Dashboard</span>
    </div>
    <nav class="flex-1 px-3 py-4 space-y-1">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
        :class="route.path === item.to
          ? 'bg-emerald-50 text-emerald-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
      >
        <Icon :name="item.icon" class="size-5 shrink-0" />
        {{ item.label }}
      </NuxtLink>
    </nav>
    <div class="p-4 border-t border-gray-200 text-xs text-gray-400">
      Purela &copy; {{ new Date().getFullYear() }}
    </div>
  </aside>
</template>
