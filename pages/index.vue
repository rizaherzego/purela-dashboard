<script setup lang="ts">
definePageMeta({ titleKey: 'nav.overview' })

const { t } = useI18n()
const { formatIDRCompact, formatPercent, formatNumber, formatDate } = useFormat()
const { from, to, queryString } = useDateRange()

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
  const deltaText = `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`
  return {
    text: t('kpi.vsPriorPeriod', { delta: deltaText }),
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
      title: t('overview.emptyNoFactTitle'),
      message: t('overview.emptyNoFactMsg'),
    }
  }
  return {
    kind: 'empty-range' as const,
    title: t('overview.emptyRangeTitle'),
    message: t('overview.emptyRangeMsg', { from: fs.min_date, to: fs.max_date }),
  }
})

const cards = computed(() => {
  if (!data.value) return []
  const c = data.value.current, p = data.value.previous
  return [
    { label: t('kpi.grossGmv'),               value: formatIDRCompact(c.gross_revenue),       change: pctChange(c.gross_revenue, p.gross_revenue)?.text,     changeType: pctChange(c.gross_revenue, p.gross_revenue)?.type,     icon: 'lucide:trending-up' },
    { label: t('kpi.netSettlement'),          value: formatIDRCompact(c.net_settlement),       change: pctChange(c.net_settlement, p.net_settlement)?.text,   changeType: pctChange(c.net_settlement, p.net_settlement)?.type,   icon: 'lucide:wallet' },
    { label: t('kpi.effectiveTakeRate'),      value: formatPercent(c.effective_take_rate),     tooltip: t('kpi.effectiveTakeRateTooltip'),                    icon: 'lucide:percent' },
    { label: t('kpi.contributionMargin'),     value: formatIDRCompact(c.contribution_margin), hint: c.contribution_margin_pct != null ? t('kpi.ofGmv', { pct: formatPercent(c.contribution_margin_pct) }) : undefined, icon: 'lucide:bar-chart-2' },
    { label: t('kpi.orders'),                 value: formatNumber(c.order_count),              change: pctChange(c.order_count, p.order_count)?.text,         changeType: pctChange(c.order_count, p.order_count)?.type,         icon: 'lucide:shopping-cart' },
  ]
})

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
      { name: t('kpi.grossGmv'),                type: 'line', data: d.gmv, smooth: true, symbol: 'none', lineStyle: { color: '#D4916E', width: 1.5 }, itemStyle: { color: '#D4916E' } },
      { name: t('kpi.netSettlement'),           type: 'line', data: d.net, smooth: true, symbol: 'none', lineStyle: { color: '#C15F3C', width: 2 },   itemStyle: { color: '#C15F3C' } },
      { name: t('kpi.contributionMarginShort'), type: 'line', data: d.cm,  smooth: true, symbol: 'none', lineStyle: { color: '#4A8FA3', width: 2 },   itemStyle: { color: '#4A8FA3' }, areaStyle: { color: 'rgba(74,143,163,0.10)' } },
    ],
  }
})

const waterfallOption = computed(() => {
  const d = wfData.value
  if (!d || !d.gross_gmv) return {}

  const items = [
    { name: t('overview.waterfallNodes.grossGmv'),      value: d.gross_gmv,                                                      type: 'total' },
    { name: t('overview.waterfallNodes.discounts'),     value: d.seller_funded_discounts,                                          type: 'decrease' },
    { name: t('overview.waterfallNodes.platformFees'),  value: (d.platform_commission || 0) + (d.service_fees || 0) + (d.transaction_fees || 0), type: 'decrease' },
    { name: t('overview.waterfallNodes.affiliate'),     value: d.affiliate_commission,                                             type: 'decrease' },
    { name: t('overview.waterfallNodes.shipping'),      value: d.shipping_cost_seller,                                             type: 'decrease' },
    { name: t('overview.waterfallNodes.refunds'),       value: d.refund_amount,                                                    type: 'decrease' },
    { name: t('overview.waterfallNodes.netSettlement'), value: d.net_settlement,                                                   type: 'total' },
    { name: t('overview.waterfallNodes.cogs'),          value: (d.cogs || 0) + (d.packaging || 0),                                 type: 'decrease' },
    { name: t('overview.waterfallNodes.ads'),           value: d.ads_attributed,                                                   type: 'decrease' },
    { name: t('overview.waterfallNodes.margin'),        value: d.contribution_margin,                                              type: 'total' },
  ]

  const TOTAL_COLORS: Record<string, string> = {
    [t('overview.waterfallNodes.grossGmv')]:      '#C15F3C',
    [t('overview.waterfallNodes.netSettlement')]: '#8B7355',
    [t('overview.waterfallNodes.margin')]:        '#4A8FA3',
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
        return `<span style="color:#9C8A77;font-size:11px">${label}</span><br>${rows.join('<br>')}<br>${t('overview.tooltipTotal')}: <b>${formatIDRCompact(total)}</b>`
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
    <DateRangeFilter
      :from="from"
      :to="to"
      @update:from="from = $event"
      @update:to="to = $event"
    />

    <div v-if="data?.last_import" class="text-xs text-cream-500 flex items-center gap-2">
      <Icon name="lucide:database" class="size-3.5" />
      <span>
        {{ $t('overview.lastImport', {
          fileType: data.last_import.file_type_id,
          channel: data.last_import.channel_id,
          date: formatDate(data.last_import.imported_at),
          start: data.last_import.period_start || '?',
          end: data.last_import.period_end || '?',
        }) }}
      </span>
    </div>
    <div v-else-if="!pending && !error" class="text-xs text-cream-500 flex items-center gap-2">
      <Icon name="lucide:database" class="size-3.5" />
      <span>{{ $t('overview.noImportsYet') }} <NuxtLink to="/upload" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('overview.noImportsLink') }}</NuxtLink> {{ $t('overview.noImportsTrailing') }}</span>
    </div>

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
            {{ $t('overview.snapToAvailable') }}
          </button>
        </div>
        <div v-else class="mt-3 flex flex-wrap gap-2">
          <NuxtLink
            to="/upload"
            class="text-xs px-2.5 py-1 rounded-md border border-clay-500 bg-clay-500 text-white hover:bg-clay-600"
          >
            {{ $t('overview.goToUpload') }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <div v-for="i in 5" :key="i" class="h-32 bg-white border border-cream-200 rounded-lg animate-pulse" />
    </div>
    <p v-else-if="error" class="text-sm text-clay-700">{{ error.message }}</p>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <KpiCard v-for="card in cards" :key="card.label" v-bind="card" />
    </div>

    <section v-if="recommendationsData?.recommendations?.length" class="bg-gradient-to-br from-cream-50 to-cream-50/50 border border-cream-200 rounded-lg p-6 shadow-card">
      <div class="mb-4">
        <div class="flex items-center gap-2 mb-1">
          <Icon name="lucide:lightbulb" class="size-4 text-clay-500" />
          <h2 class="display text-base">{{ $t('overview.insightsTitle') }}</h2>
        </div>
        <p class="text-xs text-cream-500">{{ $t('overview.insightsSubtitle') }}</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        <RecommendationCard
          v-for="rec in recommendationsData.recommendations"
          :key="rec.id"
          v-bind="rec"
        />
      </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <h2 class="display text-base mb-0.5">{{ $t('overview.trendTitle') }}</h2>
        <p class="text-xs text-cream-500 mb-4">{{ $t('overview.trendSubtitle') }}</p>
        <AppChart :option="trendOption" height="220px" />
      </section>

      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <h2 class="display text-base mb-0.5">{{ $t('overview.waterfallTitle') }}</h2>
        <p class="text-xs text-cream-500 mb-4">{{ $t('overview.waterfallSubtitle') }}</p>
        <AppChart :option="waterfallOption" height="220px" />
      </section>
    </div>

    <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
      <h2 class="display text-base mb-0.5">{{ $t('overview.breakdownTitle') }}</h2>
      <p class="text-xs text-cream-500 mb-4">{{ $t('overview.breakdownSubtitle') }}</p>
      <AppChart :option="breakdownOption" height="200px" />
    </section>
  </div>
</template>
