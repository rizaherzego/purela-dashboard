<script setup lang="ts">
definePageMeta({ title: 'SKU mapping' })

interface Mapping {
  channel_id: string
  external_sku: string
  external_product_id: string | null
  internal_sku: string | null
}

const { data, pending, error } = await useFetch<{ mappings: Mapping[] }>('/api/reference/sku-mapping')

const filterUnmapped = ref(false)
const search = ref('')

const filtered = computed(() => {
  let rows = data.value?.mappings ?? []
  if (filterUnmapped.value) rows = rows.filter(r => !r.internal_sku)
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    rows = rows.filter(r =>
      r.external_sku.toLowerCase().includes(q) ||
      (r.internal_sku ?? '').toLowerCase().includes(q),
    )
  }
  return rows
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500 max-w-2xl">
        Each channel's "Seller SKU" mapped to our internal SKU. Unmapped rows
        cause line items to land in fact_orders without a SKU until resolved.
      </p>
      <button class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed" disabled>
        Edit mappings (next turn)
      </button>
    </div>

    <div class="flex items-center gap-3">
      <input
        v-model="search"
        placeholder="Search SKU…"
        class="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      >
      <label class="inline-flex items-center gap-2 text-sm text-gray-600">
        <input v-model="filterUnmapped" type="checkbox" class="rounded">
        Show unmapped only
      </label>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div v-if="pending" class="p-8 text-center text-sm text-gray-400">Loading…</div>
      <div v-else-if="error" class="p-8 text-center text-sm text-red-600">{{ error.message }}</div>
      <div v-else-if="!filtered.length" class="p-8 text-center text-sm text-gray-400">No mappings.</div>
      <table v-else class="w-full text-sm">
        <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-4 py-2.5 text-left">Channel</th>
            <th class="px-4 py-2.5 text-left">External SKU</th>
            <th class="px-4 py-2.5 text-left">External product ID</th>
            <th class="px-4 py-2.5 text-left">Internal SKU</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="m in filtered" :key="m.channel_id + m.external_sku"
              class="hover:bg-gray-50"
              :class="{ 'bg-amber-50/50': !m.internal_sku }"
          >
            <td class="px-4 py-2.5 text-gray-500">{{ m.channel_id }}</td>
            <td class="px-4 py-2.5 font-mono text-xs">{{ m.external_sku }}</td>
            <td class="px-4 py-2.5 text-gray-500 font-mono text-xs">{{ m.external_product_id || '—' }}</td>
            <td class="px-4 py-2.5">
              <span v-if="m.internal_sku" class="font-mono text-xs">{{ m.internal_sku }}</span>
              <span v-else class="text-xs text-amber-600 font-medium">unmapped</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
