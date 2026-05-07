<script setup lang="ts">
definePageMeta({ title: 'SKU performance' })
const { formatIDRCompact, formatPercent, formatNumber } = useFormat()

interface SkuRow {
  channel_id: string
  sku: string
  product_name: string | null
  units_sold: number
  gross_revenue: number
  net_settlement: number
  total_cogs: number | null
  total_cm: number | null
  cm_pct: number | null
}

const { data, pending, error } = await useFetch<{ rows: SkuRow[] }>('/api/metrics/sku-margin')

function cmTone(pct: number | null): string {
  if (pct == null) return 'text-cream-400'
  if (pct >= 0.25) return 'text-clay-600'
  if (pct >= 0.10) return 'text-cream-700'
  return 'text-clay-800'
}
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-cream-600 max-w-2xl leading-relaxed">
      Per-SKU per-channel profitability, sortable by absolute contribution margin.
      <span class="text-clay-600">Strong (≥25%)</span> ·
      <span class="text-cream-700">Healthy (10–25%)</span> ·
      <span class="text-clay-800">At risk (&lt;10%)</span>.
    </p>

    <div class="bg-white border border-cream-200 rounded-lg overflow-hidden shadow-card">
      <div v-if="pending" class="p-12 text-center text-sm text-cream-400">Loading…</div>
      <div v-else-if="error" class="p-12 text-center text-sm text-clay-700">{{ error.message }}</div>
      <div v-else-if="!data?.rows?.length" class="p-12 text-center text-sm text-cream-500">
        No fact_orders data yet. Once you import a TikTok Shop settlement file with mapped SKUs, this will populate.
      </div>
      <table v-else class="w-full text-sm">
        <thead class="text-xs uppercase tracking-wider text-cream-500 bg-cream-100/60 border-b border-cream-200">
          <tr>
            <th class="px-5 py-3 text-left font-medium">Channel</th>
            <th class="px-5 py-3 text-left font-medium">SKU</th>
            <th class="px-5 py-3 text-left font-medium">Product</th>
            <th class="px-5 py-3 text-right font-medium">Units</th>
            <th class="px-5 py-3 text-right font-medium">Gross</th>
            <th class="px-5 py-3 text-right font-medium">Net</th>
            <th class="px-5 py-3 text-right font-medium">COGS</th>
            <th class="px-5 py-3 text-right font-medium">CM</th>
            <th class="px-5 py-3 text-right font-medium">CM%</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-200">
          <tr v-for="r in data.rows" :key="r.channel_id + r.sku" class="hover:bg-cream-50">
            <td class="px-5 py-3 text-cream-500">{{ r.channel_id }}</td>
            <td class="px-5 py-3 font-mono text-xs text-cream-700">{{ r.sku }}</td>
            <td class="px-5 py-3 max-w-xs truncate text-cream-700" :title="r.product_name ?? ''">{{ r.product_name || '—' }}</td>
            <td class="px-5 py-3 text-right text-cream-700">{{ formatNumber(r.units_sold) }}</td>
            <td class="px-5 py-3 text-right text-cream-700">{{ formatIDRCompact(r.gross_revenue) }}</td>
            <td class="px-5 py-3 text-right text-cream-700">{{ formatIDRCompact(r.net_settlement) }}</td>
            <td class="px-5 py-3 text-right text-cream-500">{{ formatIDRCompact(r.total_cogs) }}</td>
            <td class="px-5 py-3 text-right text-cream-800">{{ formatIDRCompact(r.total_cm) }}</td>
            <td class="px-5 py-3 text-right" :class="cmTone(r.cm_pct)">
              {{ formatPercent(r.cm_pct) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
