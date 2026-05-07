<script setup lang="ts">
definePageMeta({ title: 'Products' })
const { formatIDR } = useFormat()

interface Product {
  sku: string
  product_name: string
  category: string | null
  unit_size: string | null
  weight_grams: number | null
  is_bundle: boolean
  is_active: boolean
  current_cogs: number | null
  current_packaging: number | null
}

const { data, pending, error } = await useFetch<{ products: Product[] }>('/api/reference/products')
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500">
        Master product list and current COGS. Editing comes next turn — for now, manage rows via SQL or the bulk CSV importer.
      </p>
      <button class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed" disabled>
        + Add product (next turn)
      </button>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div v-if="pending" class="p-8 text-center text-sm text-gray-400">Loading…</div>
      <div v-else-if="error" class="p-8 text-center text-sm text-red-600">{{ error.message }}</div>
      <div v-else-if="!data?.products?.length" class="p-8 text-center text-sm text-gray-400">
        No products yet. Insert rows into <code class="font-mono bg-gray-100 px-1 rounded">products</code> via SQL.
      </div>
      <table v-else class="w-full text-sm">
        <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-4 py-2.5 text-left">SKU</th>
            <th class="px-4 py-2.5 text-left">Name</th>
            <th class="px-4 py-2.5 text-left">Category</th>
            <th class="px-4 py-2.5 text-left">Size</th>
            <th class="px-4 py-2.5 text-right">COGS</th>
            <th class="px-4 py-2.5 text-right">Packaging</th>
            <th class="px-4 py-2.5 text-center">Bundle</th>
            <th class="px-4 py-2.5 text-center">Active</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="p in data.products" :key="p.sku" class="hover:bg-gray-50">
            <td class="px-4 py-2.5 font-mono text-xs">{{ p.sku }}</td>
            <td class="px-4 py-2.5">{{ p.product_name }}</td>
            <td class="px-4 py-2.5 text-gray-500">{{ p.category || '—' }}</td>
            <td class="px-4 py-2.5 text-gray-500">{{ p.unit_size || '—' }}</td>
            <td class="px-4 py-2.5 text-right">{{ formatIDR(p.current_cogs) }}</td>
            <td class="px-4 py-2.5 text-right text-gray-500">{{ formatIDR(p.current_packaging) }}</td>
            <td class="px-4 py-2.5 text-center">
              <span v-if="p.is_bundle" class="text-xs text-emerald-600 font-medium">yes</span>
              <span v-else class="text-xs text-gray-400">—</span>
            </td>
            <td class="px-4 py-2.5 text-center">
              <span v-if="p.is_active" class="text-xs text-emerald-600 font-medium">active</span>
              <span v-else class="text-xs text-gray-400">archived</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
