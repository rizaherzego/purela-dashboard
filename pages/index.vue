<script setup lang="ts">
definePageMeta({ title: 'Overview' })

const { formatIDRCompact, formatPercent, formatNumber, formatDate } = useFormat()
const { from, to, queryString } = useDateRange()

// ── KPI cards (SSR-awaited) ────────────────────────────────────────────────
interface Aggregate {
  gross_revenue: number
  net_settlement: number
  contribution_margin: number
  contribution_margin_pct: number | null
  effective_take_rate: number | null
  order_count: number
  line_count: number
}
interface OverviewResponse {
  current: Aggregate
  previous: Aggregate
  last_import: any | null
  fact_summary: {
    total_rows: number
    min_date: string | null
    max_date: string | null
  }
}

const { data, pending, error } = await useFetch<OverviewResponse>(
  () => `/api/metrics/overview?${queryString.value}`,
)

function pctChange(curr: number, prev: number) {
  if (!prev || prev === 0) return null
  const delta = (curr - prev) / Math.abs(prev)
  return {
    text: `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}% vs prior period`,
    type: (delta > 0.001 ? 'up' : delta < -0.001 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
  }
}

function snapToAvailable() {
  const s = data.value?.fact_summary
  if (s?.min_date && s?.max_date) {
    from.value = s.min_date
    to.value   = s.max_date
  }
}

const emptyState = computed(() => {
  if (!data.value) return null
  const fs = data.value.fact_summary
  const lineCount = data.value.current.line_count
  if (lineCount > 0) return null
  if (fs.total_rows === 0) {
    return {
      kind: 'no-fact-data' as const,
      title: 'No fact data yet',
      message: 'Analytics are computed from settled orders. Upload a TikTok Shop settlement file (and optionally an orders export) to populate them — affiliate, ads, or returns files alone are stored but don\'t feed the fact table.',
    }
  }
  return {
    kind: 'empty-range' as const,
    title: 'No data in this range',
    message: `Available data: ${fs.min_date} → ${fs.max_date}.`,
  }
})

const cards = computed(() => {
  if (!data.value) return []
  const c = data.value.current, p = data.value.previous
  return [
    {
      label: 'Gross GMV',
      value: formatIDRCompact(c.gross_revenue),
      change: pctChange(c.gross_revenue, p.gross_revenue)?.text,
      changeType: pctChange(c.gross_revenue, p.gross_revenue)?.type,
      icon: 'lucide:trending-up',
      tooltipTitle: 'Gross GMV',
      tooltipDescription: 'Sum of gross_revenue across every order line in the selected range — the headline pre-discount, pre-fee revenue you transacted on the platform.\n\nFormula: Σ fact_orders.gross_revenue WHERE order_date IN range.\n\nDelta compares against the same-length window immediately before this one.',
    },
    {
      label: 'Net Settlement',
      value: formatIDRCompact(c.net_settlement),
      change: pctChange(c.net_settlement, p.net_settlement)?.text,
      changeType: pctChange(c.net_settlement, p.net_settlement)?.type,
      icon: 'lucide:wallet',
      tooltipTitle: 'Net Settlement',
      tooltipDescription: 'What actually hits your bank: gross revenue minus all platform deductions (commission, service & transaction fees, affiliate, shipping, refunds, vouchers).\n\nFormula: Σ fact_orders.net_settlement.',
    },
    {
      label: 'Effective take rate',
      value: formatPercent(c.effective_take_rate),
      icon: 'lucide:percent',
      tooltipTitle: 'Effective take rate',
      tooltipDescription: 'Share of GMV the platform keeps once everything is netted out — fees, discounts, vouchers, shipping the seller covers, refunds.\n\nFormula: (Σ gross_revenue − Σ net_settlement) ÷ Σ gross_revenue, settled lines only.',
    },
    {
      label: 'Contribution margin',
      value: formatIDRCompact(c.contribution_margin),
      hint: c.contribution_margin_pct != null ? `${formatPercent(c.contribution_margin_pct)} of GMV` : undefined,
      icon: 'lucide:bar-chart-2',
      tooltipTitle: 'Contribution margin',
      tooltipDescription: 'What\'s left after variable costs: net settlement minus COGS, packaging, and attributed ads spend. Excludes fixed overhead.\n\nFormula: net_settlement − cogs − packaging_cost − ads_cost_attributed.',
    },
    {
      label: 'Orders',
      value: formatNumber(c.order_count),
      change: pctChange(c.order_count, p.order_count)?.text,
      changeType: pctChange(c.order_count, p.order_count)?.type,
      icon: 'lucide:shopping-cart',
      tooltipTitle: 'Orders',
      tooltipDescription: 'Distinct order_id count in the range — multi-line orders count once.\n\nFormula: COUNT(DISTINCT fact_orders.order_id).',
    },
  ]
})

// ── Chart data (non-awaited, loads progressively) ─────────────────────────
const { data: trendData } = useFetch<{
  weeks: string[]; gmv: number[]; net: number[]; cm: number[]
}>(() => `/api/metrics/overview-trend?${queryString.value}`)

const { data: wfData } = useFetch<{
  range: { from: string; to: string }
  gross_gmv: number; seller_funded_discounts: number; platform_commission: number
  affiliate_commission: number; service_fees: number; transaction_fees: number
  shipping_cost_seller: number; refund_amount: number; net_settlement: number
  cogs: number; packaging: number; ads_attributed: number; contribution_margin: number
}>(() => `/api/metrics/fee-waterfall?${queryString.value}`)

const { data: breakdownData } = useFetch<{
  months: string[]; monthLabels: string[]
  series: { channel_id: string; label: string; gmv: number[]; cm: number[] }[]
}>(() => `/api/metrics/channel-breakdown?${queryString.value}`)

// ── Shared chart theme helpers ────────────────────────────────────────────
const TIP = {
  backgroundColor: '#FFFEF8',
  borderColor:     '#E8E2D9',
  borderRadius:    8,
  textStyle:       { fontFamily: 'Inter, sans-serif', color: '#5C4A3A', fontSize: 12 },
  extraCssText:    'box-shadow:0 4px 16px rgba(0,0,0,0.06);',
}
const AX_LABEL = { color: '#9C8A77', fontSize: 10, fontFamily: 'Inter, sans-serif' }
const SPLIT    = { lineStyle: { color: '#F0EDE8', type: 'dashed' as const } }
const AX_LINE  = { lineStyle: { color: '#E8E2D9' } }

// ── Chart: GMV / net / CM trend (multi-line) ──────────────────────────────
const trendOption = computed(() => {
  const d = trendData.value
  if (!d?.weeks?.length) return {}
  return {
    animation: true,
    grid: { left: 16, right: 16, top: 32, bottom: 44, containLabel: true },
    tooltip: {
      ...TIP,
      trigger: 'axis',
      formatter: (params: any[]) => {
        const label = params[0].axisValue
        const rows = params.map(p =>
          `${p.marker} <span style="color:#9C8A77">${p.seriesName}</span>  <b>${formatIDRCompact(p.value)}</b>`)
        return `<span style="color:#9C8A77;font-size:11px">${label}</span><br>${rows.join('<br>')}`
      },
    },
    legend: {
      bottom: 0,
      textStyle: { ...AX_LABEL, fontSize: 11 },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
    },
    xAxis: {
      type: 'category',
      data: d.weeks,
      axisLabel: { ...AX_LABEL, rotate: 30 },
      axisLine: AX_LINE,
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...AX_LABEL, formatter: (v: number) => formatIDRCompact(v) },
      splitLine: SPLIT,
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      { name: 'Gross GMV',          type: 'line', data: d.gmv, smooth: true, symbol: 'none', lineStyle: { color: '#D4916E', width: 1.5 }, itemStyle: { color: '#D4916E' } },
      { name: 'Net Settlement',     type: 'line', data: d.net, smooth: true, symbol: 'none', lineStyle: { color: '#C15F3C', width: 2 },   itemStyle: { color: '#C15F3C' } },
      { name: 'Contribution Margin', type: 'line', data: d.cm, smooth: true, symbol: 'none', lineStyle: { color: '#4A8FA3', width: 2 },   itemStyle: { color: '#4A8FA3' }, areaStyle: { color: 'rgba(74,143,163,0.10)' } },
    ],
  }
})

// ── Chart: fee waterfall ──────────────────────────────────────────────────
const waterfallOption = computed(() => {
  const d = wfData.value
  if (!d || !d.gross_gmv) return {}

  const items = [
    { name: 'Gross GMV',      value: d.gross_gmv,                                                      type: 'total' },
    { name: 'Discounts',      value: d.seller_funded_discounts,                                          type: 'decrease' },
    { name: 'Platform fees',  value: (d.platform_commission || 0) + (d.service_fees || 0) + (d.transaction_fees || 0), type: 'decrease' },
    { name: 'Affiliate',      value: d.affiliate_commission,                                             type: 'decrease' },
    { name: 'Shipping',       value: d.shipping_cost_seller,                                             type: 'decrease' },
    { name: 'Refunds',        value: d.refund_amount,                                                    type: 'decrease' },
    { name: 'Net Settlement', value: d.net_settlement,                                                   type: 'total' },
    { name: 'COGS',           value: (d.cogs || 0) + (d.packaging || 0),                                 type: 'decrease' },
    { name: 'Ads',            value: d.ads_attributed,                                                   type: 'decrease' },
    { name: 'Margin',         value: d.contribution_margin,                                              type: 'total' },
  ]

  const TOTAL_COLORS: Record<string, string> = {
    'Gross GMV': '#C15F3C', 'Net Settlement': '#8B7355', 'Margin': '#4A8FA3',
  }

  let running = 0
  const placeholders: number[] = []
  const totals: any[] = []
  const decreases: any[] = []

  for (const item of items) {
    if (item.type === 'total') {
      placeholders.push(0)
      totals.push({ value: item.value, itemStyle: { color: TOTAL_COLORS[item.name] || '#8B7355', borderRadius: [3, 3, 0, 0] } })
      decreases.push(0)
      running = item.value
    } else {
      const abs = Math.abs(item.value || 0)
      placeholders.push(running - abs)
      totals.push(0)
      decreases.push({ value: abs, itemStyle: { color: '#E8BCA8', borderRadius: [3, 3, 0, 0] } })
      running -= abs
    }
  }

  return {
    animation: true,
    grid: { left: 16, right: 16, top: 8, bottom: 52, containLabel: true },
    tooltip: {
      ...TIP,
      trigger: 'axis',
      formatter: (params: any[]) => {
        const label = params[0].axisValue
        const active = params.find(p => p.seriesIndex > 0 && p.value && p.value !== '-' && p.value > 0)
        if (!active) return label
        return `<span style="color:#9C8A77;font-size:11px">${label}</span><br><b>${formatIDRCompact(active.value)}</b>`
      },
    },
    xAxis: {
      type: 'category',
      data: items.map(i => i.name),
      axisLabel: { ...AX_LABEL, rotate: 30, interval: 0 },
      axisLine: AX_LINE,
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...AX_LABEL, formatter: (v: number) => formatIDRCompact(v) },
      splitLine: SPLIT,
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      { name: 'base',      type: 'bar', stack: 'wf', silent: true, data: placeholders, itemStyle: { color: 'transparent' } },
      { name: 'deduction', type: 'bar', stack: 'wf', data: decreases },
      { name: 'total',     type: 'bar', stack: 'wf', data: totals },
    ],
  }
})

// ── Chart: channel breakdown (stacked bar) ────────────────────────────────
const CHANNEL_COLORS: Record<string, string> = {
  tiktok_shop: '#C15F3C',
  shopee:      '#4A8FA3',
  tokopedia:   '#8B7355',
  website:     '#7C6A9E',
}

const breakdownOption = computed(() => {
  const d = breakdownData.value
  if (!d?.months?.length) return {}
  return {
    animation: true,
    grid: { left: 16, right: 16, top: 8, bottom: 28, containLabel: true },
    tooltip: {
      ...TIP,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const label = params[0].axisValue
        const total = params.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0)
        const rows = params.filter(p => p.value > 0).map(p =>
          `${p.marker} ${p.seriesName}: <b>${formatIDRCompact(p.value)}</b>`)
        return `<span style="color:#9C8A77;font-size:11px">${label}</span><br>${rows.join('<br>')}<br>Total: <b>${formatIDRCompact(total)}</b>`
      },
    },
    legend: {
      bottom: 0,
      textStyle: { ...AX_LABEL, fontSize: 11 },
      icon: 'circle',
      itemWidth: 8,
      itemHeight: 8,
    },
    xAxis: {
      type: 'category',
      data: d.monthLabels,
      axisLabel: AX_LABEL,
      axisLine: AX_LINE,
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...AX_LABEL, formatter: (v: number) => formatIDRCompact(v) },
      splitLine: SPLIT,
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: d.series.map(s => ({
      name: s.label,
      type: 'bar',
      stack: 'channel',
      data: s.cm,
      itemStyle: { color: CHANNEL_COLORS[s.channel_id] || '#9C8A77' },
    })),
  }
})

// ── Recommendations ────────────────────────────────────────────────────────
const { data: recommendationsData } = useFetch<{
  recommendations: Array<{
    id: string
    icon: string
    title: string
    severity: 'info' | 'warn' | 'critical'
    message: string
    value?: string | number
    actionUrl?: string
  }>
}>(() => `/api/metrics/recommendations?${queryString.value}`)
</script>

<template>
  <div class="space-y-8">
    <!-- Date range filter -->
    <DateRangeFilter
      :from="from"
      :to="to"
      @update:from="from = $event"
      @update:to="to = $event"
    />

    <!-- Freshness badge -->
    <div v-if="data?.last_import" class="text-xs text-cream-500 flex items-center gap-2">
      <Icon name="lucide:database" class="size-3.5" />
      <span>
        Last import: <span class="text-cream-700">{{ data.last_import.file_type_id }}</span>
        ({{ data.last_import.channel_id }}) · {{ formatDate(data.last_import.imported_at) }}
        · coverage {{ data.last_import.period_start || '?' }} → {{ data.last_import.period_end || '?' }}
      </span>
    </div>
    <div v-else-if="!pending && !error" class="text-xs text-cream-500 flex items-center gap-2">
      <Icon name="lucide:database" class="size-3.5" />
      <span>No imports yet. Visit <NuxtLink to="/upload" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">Upload</NuxtLink> to add data.</span>
    </div>

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

    <!-- KPI cards -->
    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <div v-for="i in 5" :key="i" class="h-32 bg-white border border-cream-200 rounded-lg animate-pulse" />
    </div>
    <p v-else-if="error" class="text-sm text-clay-700">{{ error.message }}</p>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <KpiCard v-for="card in cards" :key="card.label" v-bind="card" />
    </div>

    <!-- Recommendations -->
    <section v-if="recommendationsData?.recommendations?.length" class="bg-gradient-to-br from-cream-50 to-cream-50/50 border border-cream-200 rounded-lg p-6 shadow-card">
      <div class="mb-4">
        <div class="flex items-center gap-2 mb-1">
          <Icon name="lucide:lightbulb" class="size-4 text-clay-500" />
          <h2 class="display text-base">Insights & recommendations</h2>
          <InfoTooltip
            title="Insights & recommendations"
            description="Rule-based hints fired off the data in the selected range. Triggers: shipping > 15% of GMV (warn) or > 20% (critical); seller discounts > 15% (warn) or > 25% (critical); per-channel take rate > 30% (warn) or > 40% (critical); SKUs with CM% < 10%; SKUs with abnormally high return rate. Each card links to the relevant drill-down page."
          />
        </div>
        <p class="text-xs text-cream-500">Based on the selected date range</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <RecommendationCard
          v-for="rec in recommendationsData.recommendations"
          :key="rec.id"
          v-bind="rec"
        />
      </div>
    </section>

    <!-- Trend + Waterfall side by side -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <div class="flex items-center gap-1.5 mb-0.5">
          <h2 class="display text-base">GMV vs Net Settlement vs Margin</h2>
          <InfoTooltip
            title="GMV vs Net Settlement vs Margin"
            description="Three-line view of how much of your gross revenue you actually keep, week by week.

• Gross GMV — sum of fact_orders.gross_revenue.
• Net Settlement — what the platform pays out after fees & deductions.
• Contribution Margin — net minus COGS, packaging, and attributed ads.

Bucketed by ISO week (Monday-start). The widening gap between GMV and Net is your effective take rate; the gap between Net and Margin is your variable cost."
          />
        </div>
        <p class="text-xs text-cream-500 mb-4">Weekly buckets within selected range</p>
        <AppChart :option="trendOption" height="220px" />
      </section>

      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <div class="flex items-center gap-1.5 mb-0.5">
          <h2 class="display text-base">Fee waterfall</h2>
          <InfoTooltip
            title="Fee waterfall"
            description="Step-by-step decomposition of how Gross GMV becomes Contribution Margin within the selected range, summed across all channels.

Reads: Gross GMV → minus discounts (seller_discount + voucher_seller_funded) → minus platform fees (commission + service + transaction) → minus affiliate commission → minus shipping seller covers → minus refunds = Net Settlement → minus COGS + packaging → minus attributed ads = Margin.

Each bar height is the absolute deduction; the running total under it is the surviving amount."
          />
        </div>
        <p class="text-xs text-cream-500 mb-4">Summed across selected range, all channels</p>
        <AppChart :option="waterfallOption" height="220px" />
      </section>
    </div>

    <!-- Channel breakdown full-width -->
    <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
      <div class="flex items-center gap-1.5 mb-0.5">
        <h2 class="display text-base">Channel breakdown</h2>
        <InfoTooltip
          title="Channel breakdown"
          description="Stacked bars showing contribution margin per channel per month within range.

Each segment = Σ contribution_margin for that (channel, month). Months are derived from order_date with month-precision, so a range that crosses months produces multiple bars.

Useful for spotting which channel actually carries the bottom line vs. which just generates GMV."
        />
      </div>
      <p class="text-xs text-cream-500 mb-4">Contribution margin per channel per month within range</p>
      <AppChart :option="breakdownOption" height="200px" />
    </section>
  </div>
</template>
