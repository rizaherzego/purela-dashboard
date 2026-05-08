<script setup lang="ts">
definePageMeta({ title: 'Overview' })

const { formatIDRCompact, formatPercent, formatNumber, formatDate } = useFormat()

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
}

const { data, pending, error } = await useFetch<OverviewResponse>('/api/metrics/overview')

function pctChange(curr: number, prev: number) {
  if (!prev || prev === 0) return null
  const delta = (curr - prev) / Math.abs(prev)
  return {
    text: `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}% vs prior 30d`,
    type: (delta > 0.001 ? 'up' : delta < -0.001 ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
  }
}

const cards = computed(() => {
  if (!data.value) return []
  const c = data.value.current, p = data.value.previous
  return [
    { label: 'Gross GMV',        value: formatIDRCompact(c.gross_revenue),      change: pctChange(c.gross_revenue, p.gross_revenue)?.text,     changeType: pctChange(c.gross_revenue, p.gross_revenue)?.type,     icon: 'lucide:trending-up' },
    { label: 'Net Settlement',   value: formatIDRCompact(c.net_settlement),      change: pctChange(c.net_settlement, p.net_settlement)?.text,   changeType: pctChange(c.net_settlement, p.net_settlement)?.type,   icon: 'lucide:wallet' },
    { label: 'Effective take rate', value: formatPercent(c.effective_take_rate), tooltip: 'Share of GMV kept in fees, discounts & returns. (gross − net) ÷ gross.', icon: 'lucide:percent' },
    { label: 'Contribution margin', value: formatIDRCompact(c.contribution_margin), hint: c.contribution_margin_pct != null ? `${formatPercent(c.contribution_margin_pct)} of GMV` : undefined, icon: 'lucide:bar-chart-2' },
    { label: 'Orders',           value: formatNumber(c.order_count),             change: pctChange(c.order_count, p.order_count)?.text,         changeType: pctChange(c.order_count, p.order_count)?.type,         icon: 'lucide:shopping-cart' },
  ]
})

// ── Chart data (non-awaited, loads progressively) ─────────────────────────
const { data: trendData } = useFetch<{
  weeks: string[]; gmv: number[]; net: number[]; cm: number[]
}>('/api/metrics/overview-trend')

const { data: wfData } = useFetch<{
  month: string | null
  gross_gmv: number; seller_funded_discounts: number; platform_commission: number
  affiliate_commission: number; service_fees: number; transaction_fees: number
  shipping_cost_seller: number; refund_amount: number; net_settlement: number
  cogs: number; packaging: number; ads_attributed: number; contribution_margin: number
}>('/api/metrics/fee-waterfall')

const { data: breakdownData } = useFetch<{
  months: string[]; monthLabels: string[]
  series: { channel_id: string; label: string; gmv: number[]; cm: number[] }[]
}>('/api/metrics/channel-breakdown')

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
  if (!d?.month) return {}

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
</script>

<template>
  <div class="space-y-8">
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

    <!-- KPI cards -->
    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <div v-for="i in 5" :key="i" class="h-32 bg-white border border-cream-200 rounded-lg animate-pulse" />
    </div>
    <p v-else-if="error" class="text-sm text-clay-700">{{ error.message }}</p>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <KpiCard v-for="card in cards" :key="card.label" v-bind="card" />
    </div>

    <!-- Trend + Waterfall side by side -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <h2 class="display text-base mb-0.5">GMV vs Net Settlement vs Margin</h2>
        <p class="text-xs text-cream-500 mb-4">Weekly buckets, last 6 months</p>
        <AppChart :option="trendOption" height="220px" />
      </section>

      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <h2 class="display text-base mb-0.5">
          Fee waterfall
          <span v-if="wfData?.month" class="text-xs font-sans font-normal text-cream-500 ml-1">{{ wfData.month }}</span>
        </h2>
        <p class="text-xs text-cream-500 mb-4">Last fully-settled month, all channels</p>
        <AppChart :option="waterfallOption" height="220px" />
      </section>
    </div>

    <!-- Channel breakdown full-width -->
    <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
      <h2 class="display text-base mb-0.5">Channel breakdown</h2>
      <p class="text-xs text-cream-500 mb-4">Contribution margin per channel per month</p>
      <AppChart :option="breakdownOption" height="200px" />
    </section>
  </div>
</template>
