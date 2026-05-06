<script setup lang="ts">
const client = useSupabaseClient()

const { data: summary } = await useAsyncData('revenue-summary', async () => {
  const { data } = await client.rpc('get_revenue_summary')
  return data
})
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="Monthly Revenue" value="Rp 0" icon="lucide:trending-up" />
      <StatCard label="YTD Revenue" value="Rp 0" icon="lucide:calendar" />
      <StatCard label="Revenue Growth" value="0%" icon="lucide:percent" />
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-5">
      <h2 class="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue Breakdown</h2>
      <div class="h-64 flex items-center justify-center text-sm text-gray-400">
        Connect your Supabase <code class="font-mono bg-gray-100 px-1 rounded">get_revenue_summary</code> RPC to populate this chart.
      </div>
    </div>
  </div>
</template>
