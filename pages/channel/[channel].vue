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
  <div class="space-y-8">
    <div class="flex items-baseline justify-between">
      <h2 class="display text-xl">
        {{ channelLabel[channelParam] ?? channelParam }}
      </h2>
      <span class="text-xs font-mono text-cream-500">{{ channelId[channelParam] ?? channelParam }}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <h3 class="display text-base mb-1">Effective take rate trend</h3>
        <p class="text-xs text-cream-500 mb-5">Weekly, with industry benchmark line</p>
        <div class="h-48 flex items-center justify-center text-xs text-cream-400 bg-cream-50 border border-cream-100 rounded-md">
          Wires up next turn
        </div>
      </section>
      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <h3 class="display text-base mb-1">Take-rate distribution</h3>
        <p class="text-xs text-cream-500 mb-5">Histogram, last fully-settled month</p>
        <div class="h-48 flex items-center justify-center text-xs text-cream-400 bg-cream-50 border border-cream-100 rounded-md">
          Wires up next turn
        </div>
      </section>
      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card lg:col-span-2">
        <h3 class="display text-base mb-1">Fee composition over time</h3>
        <p class="text-xs text-cream-500 mb-5">Stacked area, % of GMV per month</p>
        <div class="h-48 flex items-center justify-center text-xs text-cream-400 bg-cream-50 border border-cream-100 rounded-md">
          Wires up next turn
        </div>
      </section>
    </div>

    <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
      <h3 class="display text-base mb-1">Drill-down: orders by take rate</h3>
      <p class="text-xs text-cream-500 mb-5">Sortable. Click an order to see per-line-item economics.</p>
      <div class="h-32 flex items-center justify-center text-xs text-cream-400 bg-cream-50 border border-cream-100 rounded-md">
        Wires up next turn
      </div>
    </section>
  </div>
</template>
