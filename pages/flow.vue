<script setup lang="ts">
definePageMeta({ titleKey: 'nav.flow' })

const { t } = useI18n()
const { formatIDRCompact, formatPercent } = useFormat()
const { from, to, queryString } = useDateRange()

const selectedChannels = ref<string[]>([])
const selectedSkus = ref<string[]>([])

const channelLabels = computed<Record<string, string>>(() => ({
  tiktok_shop: t('nav.channelLabels.tiktok'),
  shopee:      t('nav.channelLabels.shopee'),
  tokopedia:   t('nav.channelLabels.tokopedia'),
  website:     t('nav.channelLabels.website'),
}))

const fullQueryString = computed(() => {
  let qs = queryString.value
  if (selectedChannels.value.length)
    qs += `&channel=${selectedChannels.value.join(',')}`
  if (selectedSkus.value.length)
    qs += `&sku=${selectedSkus.value.join(',')}`
  return qs
})

interface FeeWaterfall {
  range: { from: string; to: string }
  filters?: { channels: string[]; skus: string[] }
  order_count?: number
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
  () => `/api/metrics/fee-waterfall?${fullQueryString.value}`,
)

const filterDescription = computed(() => {
  const parts: string[] = []
  if (selectedChannels.value.length) {
    const labels = selectedChannels.value.map(c => channelLabels.value[c] ?? c)
    parts.push(labels.join(', '))
  } else {
    parts.push(t('flowPage.allChannels'))
  }
  if (selectedSkus.value.length) {
    if (selectedSkus.value.length <= 3) {
      parts.push(selectedSkus.value.join(', '))
    } else {
      parts.push(t('flowPage.skusCount', { n: selectedSkus.value.length }))
    }
  }
  return parts.join(' · ')
})

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

// Sub-line for the Gross GMV KPI — total orders in the range and the
// average revenue per order. Both go into the same hint string, separated
// by a middle-dot for visual symmetry with the other KPI hints.
const grossGmvHint = computed(() => {
  const d = data.value
  const orders = d?.order_count ?? 0
  const gmv = d?.gross_gmv ?? 0
  if (orders <= 0 || gmv <= 0) return undefined
  const avg = gmv / orders
  return `${t('flowPage.tooltipOrders', { count: orders.toLocaleString() })} · ${t('flowPage.tooltipAvg', { value: formatIDRCompact(avg) })}`
})

const COST_COLORS_BY_KEY: Record<string, string> = {
  discounts:           '#C15F3C',
  platformCommission:  '#B07A55',
  serviceFees:         '#C39472',
  transactionFees:     '#D5A88E',
  affiliate:           '#8B7355',
  shipping:            '#9C7B5A',
  refunds:             '#A86B5A',
}
const ROOT_COLOR = '#A85440'
const COST_PARENT_COLOR = '#D4916E'
const NET_COLOR = '#4A8FA3'

const sankeyOption = computed(() => {
  const d = data.value
  if (!d || !hasData.value) return {}

  const gmv = d.gross_gmv

  const grossLabel = t('flowPage.nodes.grossGmv')
  const costLabel  = t('flowPage.nodes.costOfRevenue')
  const netLabel   = t('flowPage.nodes.netSettlement')

  const costRows: { name: string; key: string; value: number }[] = [
    { name: t('flowPage.nodes.discounts'),          key: 'discounts',          value: d.seller_funded_discounts },
    { name: t('flowPage.nodes.platformCommission'), key: 'platformCommission', value: d.platform_commission },
    { name: t('flowPage.nodes.serviceFees'),        key: 'serviceFees',        value: d.service_fees },
    { name: t('flowPage.nodes.transactionFees'),    key: 'transactionFees',    value: d.transaction_fees },
    { name: t('flowPage.nodes.affiliate'),          key: 'affiliate',          value: d.affiliate_commission },
    { name: t('flowPage.nodes.shipping'),           key: 'shipping',           value: d.shipping_cost_seller },
    { name: t('flowPage.nodes.refunds'),            key: 'refunds',            value: d.refund_amount },
  ].filter(r => (r.value || 0) > 0)

  const nodes: any[] = [
    { name: grossLabel, itemStyle: { color: ROOT_COLOR } },
    { name: costLabel,  itemStyle: { color: COST_PARENT_COLOR } },
    { name: netLabel,   itemStyle: { color: NET_COLOR } },
    ...costRows.map(r => ({ name: r.name, itemStyle: { color: COST_COLORS_BY_KEY[r.key] ?? '#8B7355' } })),
  ]

  const links: any[] = [
    { source: grossLabel, target: costLabel, value: costOfRevenue.value },
    { source: grossLabel, target: netLabel,  value: d.net_settlement },
    ...costRows.map(r => ({ source: costLabel, target: r.name, value: r.value })),
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
        if (p.dataType === 'edge') {
          const v = Number(p.value) || 0
          const pct = gmv > 0 ? v / gmv : 0
          return `
            <div style="font-size:11px;color:#9C8A77">${p.data.source} → ${p.data.target}</div>
            <div style="margin-top:2px"><b>${formatIDRCompact(v)}</b> · ${formatPercent(pct)} ${t('flowPage.edgeOfGmv', { value: '', pct: '' }).split('·').pop()?.trim() ?? ''}</div>
          `
        }
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
        right: 140,
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

    <FlowFilters
      :channels="selectedChannels"
      :skus="selectedSkus"
      @update:channels="selectedChannels = $event"
      @update:skus="selectedSkus = $event"
    />

    <div v-if="data?.range" class="text-xs text-cream-500 flex items-center gap-2">
      <Icon name="lucide:database" class="size-3.5" />
      <span>{{ $t('flowPage.rangeBlurb', { filters: filterDescription, from: data.range.from, to: data.range.to }) }}</span>
    </div>

    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="h-32 bg-white border border-cream-200 rounded-lg animate-pulse" />
    </div>
    <p v-else-if="error" class="text-sm text-clay-700">{{ error.message }}</p>
    <div v-else-if="hasData" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KpiCard
        :label="$t('kpi.grossGmv')"
        :value="formatIDRCompact(data!.gross_gmv)"
        :hint="grossGmvHint"
        icon="lucide:trending-up"
      />
      <KpiCard
        :label="$t('kpi.costOfRevenue')"
        :value="formatIDRCompact(costOfRevenue)"
        :hint="takeRate != null ? $t('kpi.ofGmv', { pct: formatPercent(takeRate) }) : undefined"
        icon="lucide:scissors"
      />
      <KpiCard
        :label="$t('kpi.netSettlement')"
        :value="formatIDRCompact(data!.net_settlement)"
        :hint="data!.gross_gmv > 0 ? $t('kpi.ofGmv', { pct: formatPercent(data!.net_settlement / data!.gross_gmv) }) : undefined"
        icon="lucide:wallet"
      />
    </div>

    <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
      <h2 class="display text-base mb-0.5">{{ $t('flowPage.title') }}</h2>
      <p class="text-xs text-cream-500 mb-4">
        {{ $t('flowPage.subtitle') }}
      </p>

      <div v-if="pending" class="h-[520px] bg-cream-50 rounded animate-pulse" />
      <div v-else-if="!hasData" class="h-[520px] flex items-center justify-center text-sm text-cream-500">
        {{ $t('flowPage.noFlow') }}
      </div>
      <AppChart v-else :option="sankeyOption" height="520px" />
    </section>
  </div>
</template>
