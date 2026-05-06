<script setup lang="ts">
const client = useSupabaseClient()

const { data: products, pending } = await useAsyncData('inventory', async () => {
  const { data } = await client.from('products').select('*').order('stock_qty', { ascending: true })
  return data ?? []
})

const lowStockThreshold = 10
const lowStock = computed(() => products.value?.filter(p => p.stock_qty <= lowStockThreshold) ?? [])
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="Total SKUs" value="0" icon="lucide:tag" />
      <StatCard label="Stock Value" value="Rp 0" icon="lucide:package" />
      <StatCard label="Low Stock Items" value="0" icon="lucide:alert-triangle" />
    </div>

    <div class="bg-white rounded-xl border border-gray-200">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-gray-700">Product Inventory</h2>
        <span v-if="lowStock.length" class="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
          {{ lowStock.length }} low stock
        </span>
      </div>
      <div v-if="pending" class="p-8 text-center text-sm text-gray-400">Loading...</div>
      <div v-else-if="!products?.length" class="p-8 text-center text-sm text-gray-400">
        No inventory data yet. Connect your Supabase <code class="font-mono bg-gray-100 px-1 rounded">products</code> table to get started.
      </div>
      <table v-else class="w-full text-sm">
        <thead class="text-xs text-gray-500 uppercase bg-gray-50">
          <tr>
            <th class="px-5 py-3 text-left">SKU</th>
            <th class="px-5 py-3 text-left">Product Name</th>
            <th class="px-5 py-3 text-right">Stock Qty</th>
            <th class="px-5 py-3 text-right">Unit Cost</th>
            <th class="px-5 py-3 text-right">Stock Value</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="product in products" :key="product.id"
            class="hover:bg-gray-50"
            :class="{ 'bg-amber-50': product.stock_qty <= lowStockThreshold }"
          >
            <td class="px-5 py-3 font-mono text-xs">{{ product.sku }}</td>
            <td class="px-5 py-3 font-medium">{{ product.name }}</td>
            <td class="px-5 py-3 text-right"
              :class="product.stock_qty <= lowStockThreshold ? 'text-amber-600 font-semibold' : ''"
            >{{ product.stock_qty }}</td>
            <td class="px-5 py-3 text-right text-gray-500">{{ product.unit_cost }}</td>
            <td class="px-5 py-3 text-right font-medium">{{ product.stock_value }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
