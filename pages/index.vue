<script setup lang="ts">
const stats = [
  { label: 'Total Revenue', value: 'Rp 0', change: '—', changeType: 'neutral' as const, icon: 'lucide:trending-up' },
  { label: 'Total Sales', value: '0 orders', change: '—', changeType: 'neutral' as const, icon: 'lucide:shopping-cart' },
  { label: 'Gross Profit', value: 'Rp 0', change: '—', changeType: 'neutral' as const, icon: 'lucide:bar-chart-2' },
  { label: 'Stock Value', value: 'Rp 0', change: '—', changeType: 'neutral' as const, icon: 'lucide:package' },
]
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        v-for="stat in stats"
        :key="stat.label"
        v-bind="stat"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">Revenue Trend</h2>
        <div class="h-48 flex items-center justify-center text-sm text-gray-400">
          Connect your data source to see the chart
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">Sales by Channel</h2>
        <div class="h-48 flex items-center justify-center text-sm text-gray-400">
          Connect your data source to see the chart
        </div>
      </div>
    </div>
  </div>
</template>
