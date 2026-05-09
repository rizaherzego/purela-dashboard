<script setup lang="ts">
const route = useRoute()
const { t, locale } = useI18n()
const channelParam = computed(() => String(route.params.channel))

const channelLabel = computed<Record<string, string>>(() => ({
  tiktok:    t('nav.channelLabels.tiktok'),
  shopee:    t('nav.channelLabels.shopee'),
  tokopedia: t('nav.channelLabels.tokopedia'),
  website:   t('nav.channelLabels.directWebsite'),
}))
const CHANNEL_ID: Record<string, string> = {
  tiktok:    'tiktok_shop',
  shopee:    'shopee',
  tokopedia: 'tokopedia',
  website:   'website',
}

definePageMeta({ titleKey: 'channelPage.metaTitle' })
useHead(() => ({ title: `${channelLabel.value[channelParam.value] ?? channelParam.value} — Purela` }))

const dbChannelId = computed(() => CHANNEL_ID[channelParam.value] ?? channelParam.value)
const { formatIDRCompact, formatPercent } = useFormat()
const { from, to, queryString } = useDateRange()

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
      title: t('overview.emptyNoFactTitle'),
      message: t('channelPage.noFactMsg'),
    }
  }
  return {
    kind: 'empty-range' as const,
    title: t('channelPage.noRangeTitle'),
    message: t('channelPage.noRangeMsg', { from: fs.min_date, to: fs.max_date, channel: dbChannelId.value }),
  }
})

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
    grid: { left: 16, right: 16, top: 8, bottom: 28, containLabel: true },
    tooltip: {
      ...TIP,
      trigger: 'axis',
      formatter: (params: any[]) => {
        const p = params[0]
        const valueText = p.value != null ? p.value + '%' : '—'
        return `<span style="color:#9C8A77;font-size:11px">${p.axisValue}</span><br><b>${t('channelPage.trendTooltip', { value: valueText })}</b>`
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
      name: t('channelPage.series.takeRate'),
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
        data: [{ yAxis: 15, name: t('channelPage.trendTypicalLabel') }],
        lineStyle: { color: '#9C8A77', type: 'dashed', width: 1 },
        label: { color: '#9C8A77', fontSize: 10, position: 'insideEndTop', formatter: t('channelPage.trendTypicalLabel') },
      },
    }],
  }
})

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
        return `<span style="color:#9C8A77;font-size:11px">${p.axisValue}</span><br><b>${t('channelPage.histTooltip', { value: p.value })}</b>`
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
      name: t('channelPage.series.orders'),
      type: 'bar',
      data: d.hist_counts,
      barMaxWidth: 18,
      itemStyle: { color: '#C15F3C', borderRadius: [2, 2, 0, 0] },
    }],
  }
})

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
        return `<span style="color:#9C8A77;font-size:11px">${label}</span><br>${rows.join('<br>')}<br>${t('channelPage.compositionAccounted', { pct: total.toFixed(1) + '%' })}`
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
      areaSeries(t('channelPage.series.sellerDiscounts'),    d.seller_discounts,    'seller_discounts'),
      areaSeries(t('channelPage.series.platformCommission'), d.platform_commission, 'platform_commission'),
      areaSeries(t('channelPage.series.affiliate'),          d.affiliate,           'affiliate'),
      areaSeries(t('channelPage.series.serviceFees'),        d.service_fees,        'service_fees'),
      areaSeries(t('channelPage.series.transactionFees'),    d.transaction_fees,    'transaction_fees'),
      areaSeries(t('channelPage.series.shipping'),           d.shipping,            'shipping'),
      areaSeries(t('channelPage.series.refunds'),            d.refunds,             'refunds'),
    ],
  }
})
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-baseline justify-between">
      <h2 class="display text-xl">
        {{ channelLabel[channelParam] ?? channelParam }}
      </h2>
      <span class="text-xs font-mono text-cream-500">{{ dbChannelId }}</span>
    </div>

    <DateRangeFilter
      :from="from"
      :to="to"
      @update:from="from = $event"
      @update:to="to = $event"
    />

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

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <h3 class="display text-base mb-0.5">{{ $t('channelPage.trendTitle') }}</h3>
        <p class="text-xs text-cream-500 mb-4">{{ $t('channelPage.trendSubtitle') }}</p>
        <AppChart :option="trendOption" height="220px" />
      </section>

      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <h3 class="display text-base mb-0.5">{{ $t('channelPage.histTitle') }}</h3>
        <p class="text-xs text-cream-500 mb-4">{{ $t('channelPage.histSubtitle') }}</p>
        <AppChart :option="histOption" height="220px" />
      </section>

      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card lg:col-span-2">
        <h3 class="display text-base mb-0.5">{{ $t('channelPage.compositionTitle') }}</h3>
        <p class="text-xs text-cream-500 mb-4">{{ $t('channelPage.compositionSubtitle') }}</p>
        <AppChart :option="compositionOption" height="260px" />
      </section>
    </div>

    <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
      <h3 class="display text-base mb-0.5">{{ $t('channelPage.drillTitle') }}</h3>
      <p class="text-xs text-cream-500 mb-4">{{ $t('channelPage.drillSubtitle') }}</p>
      <div class="h-24 flex items-center justify-center text-xs text-cream-400 bg-cream-50 border border-cream-100 rounded-md">
        {{ $t('channelPage.drillPlaceholder') }}
      </div>
    </section>
  </div>
</template>
