<script setup lang="ts">
const route = useRoute()
const channelParam = computed(() => String(route.params.channel))

const CHANNEL_LABEL: Record<string, string> = {
  tiktok:    'TikTok Shop',
  shopee:    'Shopee',
  tokopedia: 'Tokopedia',
  website:   'Direct Website',
}
const CHANNEL_ID: Record<string, string> = {
  tiktok:    'tiktok_shop',
  shopee:    'shopee',
  tokopedia: 'tokopedia',
  website:   'website',
}

definePageMeta({ title: 'Channel deep-dive' })
useHead(() => ({ title: `${CHANNEL_LABEL[channelParam.value] ?? channelParam.value} — Purela` }))

const dbChannelId = computed(() => CHANNEL_ID[channelParam.value] ?? channelParam.value)
const { formatIDRCompact, formatPercent } = useFormat()
const { from, to, queryString } = useDateRange()

// ── Chart data ────────────────────────────────────────────────────────────
const { data: trendData } = useFetch<{
  weeks: string[]
  take_rate: (number | null)[]
  hist_labels: string[]
  hist_counts: number[]
}>(() => `/api/metrics/channel-trend?channel_id=${dbChannelId.value}&${queryString.value}`)

const { data: feeData } = useFetch<{
  months: string[]
  monthLabels: string[]
  seller_discounts: number[]
  platform_commission: number[]
  affiliate: number[]
  service_fees: number[]
  transaction_fees: number[]
  shipping: number[]
  refunds: number[]
  cm_pct: number[]
}>(() => `/api/metrics/channel-fee-composition?channel_id=${dbChannelId.value}&${queryString.value}`)

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
  const hasTrend = (trendData.value?.weeks?.length ?? 0) > 0
  const hasFee   = (feeData.value?.months?.length ?? 0) > 0
  if (hasTrend || hasFee) return null
  const fs = factSummary.value
  if (!fs || fs.total_rows === 0) {
    return {
      kind: 'no-fact-data' as const,
      title: 'No fact data yet',
      message: 'Channel analytics come from settled orders. Upload a TikTok Shop settlement file to populate this page.',
    }
  }
  return {
    kind: 'empty-range' as const,
    title: 'No data for this channel in this range',
    message: `Fact data spans ${fs.min_date} → ${fs.max_date}, but nothing in the selected window for ${dbChannelId.value}.`,
  }
})

// ── Chart theme ───────────────────────────────────────────────────────────
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

// ── Chart: take-rate trend (line) ─────────────────────────────────────────
const trendOption = computed(() => {
  const d = trendData.value
  if (!d?.weeks?.length) return {}
  return {
    animation: true,
    grid: { left: 16, right: 16, top: 8, bottom: 28, containLabel: true },
    tooltip: {
      ...TIP,
      trigger: 'axis',
      formatter: (params: any[]) => {
        const p = params[0]
        return `<span style="color:#9C8A77;font-size:11px">${p.axisValue}</span><br><b>${p.value != null ? p.value + '%' : '—'}</b> effective take rate`
      },
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
      axisLabel: { ...AX_LABEL, formatter: (v: number) => `${v}%` },
      splitLine: SPLIT,
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      name: 'Take rate',
      type: 'line',
      data: d.take_rate,
      smooth: true,
      symbol: 'none',
      connectNulls: false,
      lineStyle: { color: '#C15F3C', width: 2 },
      itemStyle: { color: '#C15F3C' },
      areaStyle: { color: 'rgba(193,95,60,0.08)' },
      markLine: {
        silent: true,
        symbol: 'none',
        data: [{ yAxis: 15, name: '~Typical' }],
        lineStyle: { color: '#9C8A77', type: 'dashed', width: 1 },
        label: { color: '#9C8A77', fontSize: 10, position: 'insideEndTop', formatter: '~15% typical' },
      },
    }],
  }
})

// ── Chart: take-rate histogram ────────────────────────────────────────────
const histOption = computed(() => {
  const d = trendData.value
  if (!d?.hist_labels?.length) return {}
  return {
    animation: true,
    grid: { left: 16, right: 16, top: 8, bottom: 52, containLabel: true },
    tooltip: {
      ...TIP,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any[]) => {
        const p = params[0]
        return `<span style="color:#9C8A77;font-size:11px">${p.axisValue}</span><br><b>${p.value}</b> orders`
      },
    },
    xAxis: {
      type: 'category',
      data: d.hist_labels,
      axisLabel: { ...AX_LABEL, rotate: 45, interval: 4 },
      axisLine: AX_LINE,
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: AX_LABEL,
      splitLine: SPLIT,
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      name: 'Orders',
      type: 'bar',
      data: d.hist_counts,
      barMaxWidth: 18,
      itemStyle: { color: '#C15F3C', borderRadius: [2, 2, 0, 0] },
    }],
  }
})

// ── Chart: fee composition stacked area ──────────────────────────────────
const FEE_COLORS: Record<string, string> = {
  seller_discounts:    '#D4916E',
  platform_commission: '#C15F3C',
  affiliate:           '#8B7355',
  service_fees:        '#9E7B6A',
  transaction_fees:    '#C4975A',
  shipping:            '#4A8FA3',
  refunds:             '#7C6A9E',
}

function areaSeries(name: string, data: number[], key: string) {
  return {
    name,
    type: 'line',
    stack: 'fees',
    smooth: true,
    symbol: 'none',
    data,
    lineStyle: { width: 0 },
    areaStyle: { color: FEE_COLORS[key] ?? '#9C8A77' },
    emphasis: { lineStyle: { width: 0 } },
  }
}

const compositionOption = computed(() => {
  const d = feeData.value
  if (!d?.months?.length) return {}
  return {
    animation: true,
    grid: { left: 16, right: 16, top: 36, bottom: 28, containLabel: true },
    tooltip: {
      ...TIP,
      trigger: 'axis',
      formatter: (params: any[]) => {
        const label = params[0].axisValue
        const total = params.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0)
        const rows = params.map(p => `${p.marker} ${p.seriesName}: <b>${p.value}%</b>`)
        return `<span style="color:#9C8A77;font-size:11px">${label}</span><br>${rows.join('<br>')}<br>Accounted: <b>${total.toFixed(1)}%</b>`
      },
    },
    legend: {
      top: 0,
      textStyle: { ...AX_LABEL, fontSize: 10 },
      icon: 'circle',
      itemWidth: 7,
      itemHeight: 7,
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
      axisLabel: { ...AX_LABEL, formatter: (v: number) => `${v}%` },
      splitLine: SPLIT,
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      areaSeries('Seller discounts',    d.seller_discounts,    'seller_discounts'),
      areaSeries('Platform commission', d.platform_commission, 'platform_commission'),
      areaSeries('Affiliate',           d.affiliate,           'affiliate'),
      areaSeries('Service fees',        d.service_fees,        'service_fees'),
      areaSeries('Transaction fees',    d.transaction_fees,    'transaction_fees'),
      areaSeries('Shipping',            d.shipping,            'shipping'),
      areaSeries('Refunds',             d.refunds,             'refunds'),
    ],
  }
})
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-baseline justify-between">
      <h2 class="display text-xl">
        {{ CHANNEL_LABEL[channelParam] ?? channelParam }}
      </h2>
      <span class="text-xs font-mono text-cream-500">{{ dbChannelId }}</span>
    </div>

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

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Take-rate trend -->
      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <div class="flex items-center gap-1.5 mb-0.5">
          <h3 class="display text-base">Effective take-rate trend</h3>
          <InfoTooltip
            title="Effective take-rate trend"
            description="Weekly take rate for this channel, settled orders only.

Per week: (Σ gross_revenue − Σ net_settlement) ÷ Σ gross_revenue, expressed as %.

The dashed line at 15% is a rough industry baseline for marketplace marketplaces — anything sustained above it means the channel is keeping more of your GMV than typical."
          />
        </div>
        <p class="text-xs text-cream-500 mb-4">Weekly — settled orders only · dashed = rough industry baseline</p>
        <AppChart :option="trendOption" height="220px" />
      </section>

      <!-- Distribution histogram -->
      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <div class="flex items-center gap-1.5 mb-0.5">
          <h3 class="display text-base">Take-rate distribution</h3>
          <InfoTooltip
            title="Take-rate distribution"
            description="Per-order take rate, bucketed in 2-percentage-point bins from 0% to 60%.

For each settled line: (gross − net) ÷ gross. Bars show how many orders fall in each bucket.

A wide spread or a long right tail means a few orders are getting hit much harder than average — usually high-discount or affiliate-heavy ones. A tight cluster means the platform's costs are predictable per order."
          />
        </div>
        <p class="text-xs text-cream-500 mb-4">Per-order histogram within selected range</p>
        <AppChart :option="histOption" height="220px" />
      </section>

      <!-- Fee composition full-width -->
      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card lg:col-span-2">
        <div class="flex items-center gap-1.5 mb-0.5">
          <h3 class="display text-base">Fee composition over time</h3>
          <InfoTooltip
            title="Fee composition over time"
            description="Stacked area chart of where the channel's take rate goes, by month within range.

Each layer is a deduction expressed as % of gross GMV: seller-funded discounts, platform commission, affiliate commission, service fees, transaction fees, shipping seller covers, refunds.

The total stack height ≈ effective take rate; the shape of the stack tells you whether the take is getting eaten by ads (affiliate), ops (shipping/refunds), or platform fees."
          />
        </div>
        <p class="text-xs text-cream-500 mb-4">Stacked area — each layer is % of gross GMV per month within range</p>
        <AppChart :option="compositionOption" height="260px" />
      </section>
    </div>

    <!-- Drill-down placeholder (next turn) -->
    <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
      <h3 class="display text-base mb-0.5">Drill-down: orders by take rate</h3>
      <p class="text-xs text-cream-500 mb-4">Sortable. Click an order to see per-line-item economics.</p>
      <div class="h-24 flex items-center justify-center text-xs text-cream-400 bg-cream-50 border border-cream-100 rounded-md">
        Order drill-down table — next milestone
      </div>
    </section>
  </div>
</template>
