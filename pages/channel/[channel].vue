<script setup lang="ts">
const route = useRoute()
const channelParam = computed(() => String(route.params.channel))

const channelLabel: Record<string, string> = {
  tiktok: 'TikTok Shop',
  shopee: 'Shopee',
  tokopedia: 'Tokopedia',
  website: 'Direct Website',
}
const channelId: Record<string, string> = {
  tiktok: 'tiktok_shop',
  shopee: 'shopee',
  tokopedia: 'tokopedia',
  website: 'website',
}

definePageMeta({ title: 'Channel deep-dive' })
useHead(() => ({
  title: () => `${channelLabel[channelParam.value] ?? channelParam.value} — Purela`,
}))
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-baseline justify-between">
      <h2 class="text-base font-semibold text-gray-900">
        {{ channelLabel[channelParam] ?? channelParam }}
      </h2>
      <span class="text-xs text-gray-400 font-mono">{{ channelId[channelParam] ?? channelParam }}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <h3 class="text-sm font-semibold text-gray-700 mb-1">Effective take rate trend</h3>
        <p class="text-xs text-gray-400 mb-4">Weekly, with industry benchmark line</p>
        <div class="h-48 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
          Wires up next turn
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <h3 class="text-sm font-semibold text-gray-700 mb-1">Take-rate distribution</h3>
        <p class="text-xs text-gray-400 mb-4">Histogram, last fully-settled month</p>
        <div class="h-48 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
          Wires up next turn
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
        <h3 class="text-sm font-semibold text-gray-700 mb-1">Fee composition over time</h3>
        <p class="text-xs text-gray-400 mb-4">Stacked area, % of GMV per month</p>
        <div class="h-48 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
          Wires up next turn
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-1">Drill-down: orders by take rate</h3>
      <p class="text-xs text-gray-400 mb-4">Sortable. Click an order to see per-line-item economics.</p>
      <div class="h-32 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
        Wires up next turn
      </div>
    </div>
  </div>
</template>
