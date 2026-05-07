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
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <p class="text-sm text-cream-600 max-w-2xl leading-relaxed">
        Each channel's "Seller SKU" mapped to our internal SKU. Unmapped rows
        cause line items to land in fact_orders without a SKU until resolved.
      </p>
      <button class="px-3.5 py-2 text-sm border border-cream-200 rounded-md text-cream-400 cursor-not-allowed" disabled>
        Edit mappings
      </button>
    </div>

    <div class="flex items-center gap-4">
      <input
        v-model="search"
        placeholder="Search SKU…"
        class="px-3.5 py-2 bg-white border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500 transition w-64"
      >
      <label class="inline-flex items-center gap-2 text-sm text-cream-600">
        <input v-model="filterUnmapped" type="checkbox" class="rounded text-clay-500 focus:ring-clay-500">
        Show unmapped only
      </label>
    </div>

    <div class="bg-white border border-cream-200 rounded-lg overflow-hidden shadow-card">
      <div v-if="pending" class="p-12 text-center text-sm text-cream-400">Loading…</div>
      <div v-else-if="error" class="p-12 text-center text-sm text-clay-700">{{ error.message }}</div>
      <div v-else-if="!filtered.length" class="p-12 text-center text-sm text-cream-500">No mappings.</div>
      <table v-else class="w-full text-sm">
        <thead class="text-xs uppercase tracking-wider text-cream-500 bg-cream-100/60 border-b border-cream-200">
          <tr>
            <th class="px-5 py-3 text-left font-medium">Channel</th>
            <th class="px-5 py-3 text-left font-medium">External SKU</th>
            <th class="px-5 py-3 text-left font-medium">External product ID</th>
            <th class="px-5 py-3 text-left font-medium">Internal SKU</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-200">
          <tr v-for="m in filtered" :key="m.channel_id + m.external_sku"
              class="hover:bg-cream-50"
              :class="{ 'bg-clay-50/30': !m.internal_sku }"
          >
            <td class="px-5 py-3 text-cream-500">{{ m.channel_id }}</td>
            <td class="px-5 py-3 font-mono text-xs text-cream-700">{{ m.external_sku }}</td>
            <td class="px-5 py-3 text-cream-500 font-mono text-xs">{{ m.external_product_id || '—' }}</td>
            <td class="px-5 py-3">
              <span v-if="m.internal_sku" class="font-mono text-xs text-cream-700">{{ m.internal_sku }}</span>
              <span v-else class="text-xs text-clay-600">unmapped</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
