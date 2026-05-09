<script setup lang="ts">
definePageMeta({ title: 'SKU performance' })
const { formatIDRCompact, formatPercent, formatNumber } = useFormat()
const { from, to, queryString } = useDateRange()

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

const { data, pending, error } = await useFetch<{ rows: SkuRow[] }>(
  () => `/api/metrics/sku-margin?${queryString.value}`,
)

const { data: factSummary } = await useFetch<{
  total_rows: number; min_date: string | null; max_date: string | null
}>('/api/metrics/fact-summary')

function snapToAvailable() {
  const s = factSummary.value
  if (s?.min_date && s?.max_date) {
    from.value = s.min_date
    to.value   = s.max_date
  }
}

const emptyState = computed(() => {
  if (pending.value || error.value) return null
  if (data.value?.rows?.length) return null
  const fs = factSummary.value
  if (!fs || fs.total_rows === 0) {
    return {
      kind: 'no-fact-data' as const,
      title: 'No fact data yet',
      message: 'Per-SKU profitability comes from settled orders. Upload a TikTok Shop settlement file to populate this page.',
    }
  }
  return {
    kind: 'empty-range' as const,
    title: 'No data in this range',
    message: `Available data: ${fs.min_date} → ${fs.max_date}.`,
  }
})

function cmTone(pct: number | null): string {
  if (pct == null) return 'text-cream-400'
  if (pct >= 0.25) return 'text-clay-600'
  if (pct >= 0.10) return 'text-cream-700'
  return 'text-clay-800'
}

// ── Top-10 SKUs chart ─────────────────────────────────────────────────────
const TIP = {
  backgroundColor: '#FFFEF8',
  borderColor:     '#E8E2D9',
  borderRadius:    8,
  textStyle:       { fontFamily: 'Inter, sans-serif', color: '#5C4A3A', fontSize: 12 },
  extraCssText:    'box-shadow:0 4px 16px rgba(0,0,0,0.06);',
}
const AX_LABEL = { color: '#9C8A77', fontSize: 10, fontFamily: 'Inter, sans-serif' }
const SPLIT    = { lineStyle: { color: '#F0EDE8', type: 'dashed' as const } }

const top10 = computed(() =>
  [...(data.value?.rows ?? [])]
    .filter(r => r.total_cm != null)
    .sort((a, b) => (b.total_cm ?? 0) - (a.total_cm ?? 0))
    .slice(0, 10),
)

const skuChartOption = computed(() => {
  if (!top10.value.length) return {}
  return {
    animation: true,
    grid: { left: 16, right: 72, top: 8, bottom: 8, containLabel: true },
    tooltip: {
      ...TIP,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const p = params[0]
        const row = top10.value[p.dataIndex]
        return [
          `<b>${row.sku}</b>`,
          row.product_name ? `<span style="color:#9C8A77">${row.product_name}</span>` : '',
          `CM: <b>${formatIDRCompact(p.value)}</b>`,
          row.cm_pct != null ? `CM%: <b>${formatPercent(row.cm_pct)}</b>` : '',
        ].filter(Boolean).join('<br>')
      },
    },
    xAxis: {
      type: 'value',
      axisLabel: { ...AX_LABEL, formatter: (v: number) => formatIDRCompact(v) },
      splitLine: SPLIT,
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'category',
      data: top10.value.map(r => r.sku),
      inverse: true,
      axisLabel: { ...AX_LABEL, fontFamily: 'monospace', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: top10.value.map(r => r.total_cm),
      barMaxWidth: 22,
      itemStyle: {
        color: (params: any) => {
          const pct = top10.value[params.dataIndex]?.cm_pct ?? 0
          return pct >= 0.25 ? '#4A8FA3' : pct >= 0.10 ? '#C15F3C' : '#D4916E'
        },
        borderRadius: [0, 4, 4, 0],
      },
      label: {
        show: true,
        position: 'right',
        formatter: (params: any) => {
          const pct = top10.value[params.dataIndex]?.cm_pct
          return pct != null ? formatPercent(pct) : ''
        },
        color: '#9C8A77',
        fontSize: 10,
      },
    }],
  }
})
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-cream-600 max-w-2xl leading-relaxed">
      Per-SKU per-channel profitability, ranked by absolute contribution margin.
      <span class="text-clay-600">Strong (≥25%)</span> ·
      <span class="text-cream-700">Healthy (10–25%)</span> ·
      <span class="text-clay-800">At risk (&lt;10%)</span>.
    </p>

    <DateRangeFilter
      :from="from"
      :to="to"
      @update:from="from = $event"
      @update:to="to = $event"
    />

    <!-- Empty-state diagnostic -->
    <div
      v-if="emptyState"
      class="bg-clay-50 border border-clay-200 rounded-lg p-5 shadow-card flex items-start gap-3"
    >
      <Icon name="lucide:info" class="size-5 text-clay-600 shrink-0 mt-0.5" />
      <div class="flex-1 min-w-0">
        <div class="display text-sm text-clay-800 mb-1">{{ emptyState.title }}</div>
        <p class="text-xs text-cream-700 leading-relaxed">{{ emptyState.message }}</p>
        <div v-if="emptyState.kind === 'empty-range'" class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="text-xs px-2.5 py-1 rounded-md border border-clay-500 bg-clay-500 text-white hover:bg-clay-600"
            @click="snapToAvailable"
          >
            Snap range to available data
          </button>
        </div>
        <div v-else class="mt-3 flex flex-wrap gap-2">
          <NuxtLink
            to="/upload"
            class="text-xs px-2.5 py-1 rounded-md border border-clay-500 bg-clay-500 text-white hover:bg-clay-600"
          >
            Go to Upload
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Top-10 bar chart -->
    <section v-if="!pending && top10.length" class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
      <div class="flex items-center gap-1.5 mb-0.5">
        <h2 class="display text-base">Top 10 SKUs by contribution margin</h2>
        <InfoTooltip
          title="Top 10 SKUs by contribution margin"
          description="Your ten most profitable SKUs in the selected range, ranked by absolute contribution margin (the actual rupiah they put in your pocket).

Bar length: Σ contribution_margin for that SKU.
Color: CM% tier — teal ≥ 25% (strong), orange 10–25% (healthy), peach < 10% (at-risk).
Right-side label: CM% = total_cm ÷ gross_revenue.

Aggregated from settled orders only; bundles count as one SKU here (their components are exploded only in stock views)."
        />
      </div>
      <p class="text-xs text-cream-500 mb-4">Bars show absolute CM · label is CM%</p>
      <AppChart :option="skuChartOption" height="280px" />
    </section>

    <!-- Detailed table -->
    <div class="bg-white border border-cream-200 rounded-lg overflow-hidden shadow-card">
      <div class="px-5 py-3 border-b border-cream-200 flex items-center gap-1.5">
        <h3 class="display text-sm">Per-SKU performance</h3>
        <InfoTooltip
          title="Per-SKU performance table"
          description="Full per-SKU per-channel breakdown for the selected range. One row per (channel_id, sku) with everything aggregated from settled fact_orders.

Columns: Units (Σ quantity) · Gross (Σ gross_revenue) · Net (Σ net_settlement) · COGS (Σ cogs from product_costs at order date) · CM (net − cogs − packaging − attributed ads) · CM% (CM ÷ gross).

CM% color tiers: ≥ 25% strong, 10–25% healthy, < 10% at-risk. Sorted by CM descending; top 200 rows."
        />
      </div>
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
