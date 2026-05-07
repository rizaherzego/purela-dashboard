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

function cmColor(pct: number | null): string {
  if (pct == null) return 'text-gray-400'
  if (pct >= 0.25) return 'text-emerald-600'
  if (pct >= 0.10) return 'text-amber-600'
  return 'text-red-600'
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-gray-500">
      Per-SKU per-channel profitability. Sortable by absolute contribution margin.
      Color: <span class="text-emerald-600 font-medium">≥25%</span> /
      <span class="text-amber-600 font-medium">10–25%</span> /
      <span class="text-red-600 font-medium">&lt;10%</span> CM.
    </p>

    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div v-if="pending" class="p-8 text-center text-sm text-gray-400">Loading…</div>
      <div v-else-if="error" class="p-8 text-center text-sm text-red-600">{{ error.message }}</div>
      <div v-else-if="!data?.rows?.length" class="p-8 text-center text-sm text-gray-400">
        No fact_orders data yet. Once you import a TikTok Shop settlement file with mapped SKUs, this will populate.
      </div>
      <table v-else class="w-full text-sm">
        <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-4 py-2.5 text-left">Channel</th>
            <th class="px-4 py-2.5 text-left">SKU</th>
            <th class="px-4 py-2.5 text-left">Product</th>
            <th class="px-4 py-2.5 text-right">Units</th>
            <th class="px-4 py-2.5 text-right">Gross</th>
            <th class="px-4 py-2.5 text-right">Net</th>
            <th class="px-4 py-2.5 text-right">COGS</th>
            <th class="px-4 py-2.5 text-right">CM</th>
            <th class="px-4 py-2.5 text-right">CM%</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="r in data.rows" :key="r.channel_id + r.sku" class="hover:bg-gray-50">
            <td class="px-4 py-2.5 text-gray-500">{{ r.channel_id }}</td>
            <td class="px-4 py-2.5 font-mono text-xs">{{ r.sku }}</td>
            <td class="px-4 py-2.5 max-w-xs truncate" :title="r.product_name ?? ''">{{ r.product_name || '—' }}</td>
            <td class="px-4 py-2.5 text-right">{{ formatNumber(r.units_sold) }}</td>
            <td class="px-4 py-2.5 text-right">{{ formatIDRCompact(r.gross_revenue) }}</td>
            <td class="px-4 py-2.5 text-right">{{ formatIDRCompact(r.net_settlement) }}</td>
            <td class="px-4 py-2.5 text-right text-gray-500">{{ formatIDRCompact(r.total_cogs) }}</td>
            <td class="px-4 py-2.5 text-right font-medium">{{ formatIDRCompact(r.total_cm) }}</td>
            <td class="px-4 py-2.5 text-right font-semibold" :class="cmColor(r.cm_pct)">
              {{ formatPercent(r.cm_pct) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
