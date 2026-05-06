<script setup lang="ts">
const client = useSupabaseClient()

const { data: sales, pending } = await useAsyncData('sales', async () => {
  const { data } = await client.from('sales').select('*').order('created_at', { ascending: false }).limit(50)
  return data ?? []
})
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="Orders Today" value="0" icon="lucide:shopping-cart" />
      <StatCard label="Revenue Today" value="Rp 0" icon="lucide:trending-up" />
      <StatCard label="Avg. Order Value" value="Rp 0" icon="lucide:receipt" />
    </div>

    <div class="bg-white rounded-xl border border-gray-200">
      <div class="px-5 py-4 border-b border-gray-100">
        <h2 class="text-sm font-semibold text-gray-700">Recent Orders</h2>
      </div>
      <div v-if="pending" class="p-8 text-center text-sm text-gray-400">Loading...</div>
      <div v-else-if="!sales?.length" class="p-8 text-center text-sm text-gray-400">
        No sales data yet. Connect your Supabase <code class="font-mono bg-gray-100 px-1 rounded">sales</code> table to get started.
      </div>
      <table v-else class="w-full text-sm">
        <thead class="text-xs text-gray-500 uppercase bg-gray-50">
          <tr>
            <th class="px-5 py-3 text-left">Order ID</th>
            <th class="px-5 py-3 text-left">Date</th>
            <th class="px-5 py-3 text-right">Amount</th>
            <th class="px-5 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="sale in sales" :key="sale.id" class="hover:bg-gray-50">
            <td class="px-5 py-3 font-mono">{{ sale.id }}</td>
            <td class="px-5 py-3 text-gray-500">{{ sale.created_at }}</td>
            <td class="px-5 py-3 text-right font-medium">{{ sale.amount }}</td>
            <td class="px-5 py-3">{{ sale.status }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
