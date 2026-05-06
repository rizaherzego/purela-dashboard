<script setup lang="ts">
const client = useSupabaseClient()

const { data: profitData } = await useAsyncData('profitability', async () => {
  const { data } = await client.rpc('get_profitability_summary')
  return data
})
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard label="Gross Profit" value="Rp 0" icon="lucide:bar-chart-2" />
      <StatCard label="Gross Margin" value="0%" icon="lucide:percent" />
      <StatCard label="Net Profit" value="Rp 0" icon="lucide:trending-up" />
      <StatCard label="Net Margin" value="0%" icon="lucide:activity" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">Profit by Product</h2>
        <div class="h-56 flex items-center justify-center text-sm text-gray-400">
          Connect your Supabase <code class="font-mono bg-gray-100 px-1 rounded">get_profitability_summary</code> RPC to populate this chart.
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-4">Cost Breakdown</h2>
        <div class="h-56 flex items-center justify-center text-sm text-gray-400">
          COGS, operating expenses, and margin analysis will appear here.
        </div>
      </div>
    </div>
  </div>
</template>
