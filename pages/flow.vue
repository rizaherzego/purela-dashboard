<script setup lang="ts">
definePageMeta({ title: 'Flow' })

const { formatIDRCompact, formatPercent } = useFormat()
const { from, to, queryString } = useDateRange()

interface FeeWaterfall {
  range: { from: string; to: string }
  gross_gmv: number
  seller_funded_discounts: number
  platform_commission: number
  affiliate_commission: number
  service_fees: number
  transaction_fees: number
  shipping_cost_seller: number
  refund_amount: number
  net_settlement: number
  cogs: number
  packaging: number
  ads_attributed: number
  contribution_margin: number
}

const { data, pending, error } = await useFetch<FeeWaterfall>(
  () => `/api/metrics/fee-waterfall?${queryString.value}`,
)

// ── Derived totals ────────────────────────────────────────────────────────
// Cost of Revenue = sum of every cost category we break out below.
// This guarantees the two-stage Sankey reconciles exactly: the parent flow
// (GMV → Cost of Revenue) equals the sum of the children flowing out of it.
const costOfRevenue = computed(() => {
  const d = data.value
  if (!d) return 0
  return (
    (d.seller_funded_discounts || 0) +
    (d.platform_commission     || 0) +
    (d.service_fees            || 0) +
    (d.transaction_fees        || 0) +
    (d.affiliate_commission    || 0) +
    (d.shipping_cost_seller    || 0) +
    (d.refund_amount           || 0)
  )
})

const takeRate = computed(() => {
  const g = data.value?.gross_gmv ?? 0
  if (g <= 0) return null
  return costOfRevenue.value / g
})

const hasData = computed(() => (data.value?.gross_gmv ?? 0) > 0)

// ── Cost-bucket palette ───────────────────────────────────────────────────
// Mirrors the shades used in the Channel Deep-Dive fee-composition chart so
// "Discounts" is the same color whether you see it on the Sankey or the
// stacked area on /channel/[channel].
const COST_COLORS: Record<string, string> = {
  'Discounts':           '#C15F3C',
  'Platform commission': '#B07A55',
  'Service fees':        '#C39472',
  'Transaction fees':    '#D5A88E',
  'Affiliate':           '#8B7355',
  'Shipping':            '#9C7B5A',
  'Refunds':             '#A86B5A',
}
const ROOT_COLOR = '#A85440'   // Gross GMV — clay-600
const COST_PARENT_COLOR = '#D4916E' // Cost of Revenue — clay-300
const NET_COLOR = '#4A8FA3'    // Net Settlement — same blue-teal used for CM

// ── Sankey option ─────────────────────────────────────────────────────────
const sankeyOption = computed(() => {
  const d = data.value
  if (!d || !hasData.value) return {}

  const gmv = d.gross_gmv

  // Build cost rows. Filter out zero-value items so we don't render orphan
  // labels with no flow — keeps the diagram readable when a category is unused.
  const costRows: { name: string; value: number }[] = [
    { name: 'Discounts',           value: d.seller_funded_discounts },
    { name: 'Platform commission', value: d.platform_commission },
    { name: 'Service fees',        value: d.service_fees },
    { name: 'Transaction fees',    value: d.transaction_fees },
    { name: 'Affiliate',           value: d.affiliate_commission },
    { name: 'Shipping',            value: d.shipping_cost_seller },
    { name: 'Refunds',             value: d.refund_amount },
  ].filter(r => (r.value || 0) > 0)

  const nodes: any[] = [
    { name: 'Gross GMV',       itemStyle: { color: ROOT_COLOR } },
    { name: 'Cost of Revenue', itemStyle: { color: COST_PARENT_COLOR } },
    { name: 'Net Settlement',  itemStyle: { color: NET_COLOR } },
    ...costRows.map(r => ({ name: r.name, itemStyle: { color: COST_COLORS[r.name] ?? '#8B7355' } })),
  ]

  // Links: GMV → {Cost of Revenue, Net Settlement}, then Cost of Revenue → each child.
  // Note: net_settlement comes from the API directly. If gross_gmv ≠
  // costOfRevenue + net_settlement (unusual fees TikTok reports but we don't
  // bucket), we accept the small visual discrepancy; the alternative is
  // adding an "Other" reconciler bucket and we keep the chart clean for now.
  const links: any[] = [
    { source: 'Gross GMV', target: 'Cost of Revenue', value: costOfRevenue.value },
    { source: 'Gross GMV', target: 'Net Settlement',  value: d.net_settlement },
    ...costRows.map(r => ({ source: 'Cost of Revenue', target: r.name, value: r.value })),
  ]

  return {
    animation: true,
    tooltip: {
      backgroundColor: '#FFFEF8',
      borderColor:     '#E8E2D9',
      borderRadius:    8,
      textStyle:       { fontFamily: 'Inter, sans-serif', color: '#5C4A3A', fontSize: 12 },
      extraCssText:    'box-shadow:0 4px 16px rgba(0,0,0,0.06);',
      trigger: 'item',
      formatter: (p: any) => {
        // Two payload shapes: nodes (`p.dataType === 'node'`) and links (`'edge'`).
        if (p.dataType === 'edge') {
          const v = Number(p.value) || 0
          const pct = gmv > 0 ? v / gmv : 0
          return `
            <div style="font-size:11px;color:#9C8A77">${p.data.source} → ${p.data.target}</div>
            <div style="margin-top:2px"><b>${formatIDRCompact(v)}</b> · ${formatPercent(pct)} of GMV</div>
          `
        }
        // Node hover: show the node total (sum of incoming, or for root, the value itself).
        return `<div><b>${p.name}</b></div>`
      },
    },
    series: [
      {
        type: 'sankey',
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'left',
        nodeWidth: 18,
        nodeGap: 10,
        layoutIterations: 64,
        left: 16,
        right: 140, // extra room on the right for cost-category labels
        top: 16,
        bottom: 16,
        label: {
          color: '#5C4A3A',
          fontSize: 12,
          fontFamily: 'Inter, sans-serif',
          formatter: (p: any) => p.name,
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
          opacity: 0.45,
        },
        data: nodes,
        links: links,
      },
    ],
  }
})
</script>

<template>
  <div class="space-y-8">
    <DateRangeFilter
      :from="from"
      :to="to"
      @update:from="from = $event"
      @update:to="to = $event"
    />

    <!-- Range copy / empty state -->
    <div v-if="data?.range" class="text-xs text-cream-500 flex items-center gap-2">
      <Icon name="lucide:database" class="size-3.5" />
      <span>Aggregated from <span class="text-cream-700">all channels</span> over {{ data.range.from }} → {{ data.range.to }}.</span>
    </div>

    <!-- KPI summary -->
    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="h-32 bg-white border border-cream-200 rounded-lg animate-pulse" />
    </div>
    <p v-else-if="error" class="text-sm text-clay-700">{{ error.message }}</p>
    <div v-else-if="hasData" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KpiCard
        label="Gross GMV"
        :value="formatIDRCompact(data!.gross_gmv)"
        icon="lucide:trending-up"
      />
      <KpiCard
        label="Cost of Revenue"
        :value="formatIDRCompact(costOfRevenue)"
        :hint="takeRate != null ? `${formatPercent(takeRate)} of GMV` : undefined"
        icon="lucide:scissors"
      />
      <KpiCard
        label="Net Settlement"
        :value="formatIDRCompact(data!.net_settlement)"
        :hint="data!.gross_gmv > 0 ? `${formatPercent(data!.net_settlement / data!.gross_gmv)} of GMV` : undefined"
        icon="lucide:wallet"
      />
    </div>

    <!-- Sankey -->
    <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
      <h2 class="display text-base mb-0.5">Where does GMV go?</h2>
      <p class="text-xs text-cream-500 mb-4">
        Each gross-GMV rupiah splits into the cost categories that drain it and the net settlement TikTok pays out.
      </p>

      <div v-if="pending" class="h-[520px] bg-cream-50 rounded animate-pulse" />
      <div v-else-if="!hasData" class="h-[520px] flex items-center justify-center text-sm text-cream-500">
        No flow to show — upload data or expand the date range.
      </div>
      <AppChart v-else :option="sankeyOption" height="520px" />
    </section>
  </div>
</template>
