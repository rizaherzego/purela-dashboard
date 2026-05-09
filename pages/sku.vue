<script setup lang="ts">
definePageMeta({ titleKey: 'nav.skus' })
const { t } = useI18n()
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
      title: t('overview.emptyNoFactTitle'),
      message: t('skuPage.noFactMsg'),
    }
  }
  return {
    kind: 'empty-range' as const,
    title: t('overview.emptyRangeTitle'),
    message: t('overview.emptyRangeMsg', { from: fs.min_date, to: fs.max_date }),
  }
})

function cmTone(pct: number | null): string {
  if (pct == null) return 'text-cream-400'
  if (pct >= 0.25) return 'text-clay-600'
  if (pct >= 0.10) return 'text-cream-700'
  return 'text-clay-800'
}

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
          `${t('kpi.contributionMarginShort')}: <b>${formatIDRCompact(p.value)}</b>`,
          row.cm_pct != null ? `${t('skuPage.columns.cmPct')}: <b>${formatPercent(row.cm_pct)}</b>` : '',
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
      {{ $t('skuPage.intro') }}
      <span class="text-clay-600">{{ $t('skuPage.strong') }}</span> ·
      <span class="text-cream-700">{{ $t('skuPage.healthy') }}</span> ·
      <span class="text-clay-800">{{ $t('skuPage.atRisk') }}</span>.
    </p>

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

    <section v-if="!pending && top10.length" class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
      <h2 class="display text-base mb-0.5">{{ $t('skuPage.top10Title') }}</h2>
      <p class="text-xs text-cream-500 mb-4">{{ $t('skuPage.top10Subtitle') }}</p>
      <AppChart :option="skuChartOption" height="280px" />
    </section>

    <div class="bg-white border border-cream-200 rounded-lg overflow-hidden shadow-card">
      <div v-if="pending" class="p-12 text-center text-sm text-cream-400">{{ $t('common.loading') }}</div>
      <div v-else-if="error" class="p-12 text-center text-sm text-clay-700">{{ error.message }}</div>
      <div v-else-if="!data?.rows?.length" class="p-12 text-center text-sm text-cream-500">
        {{ $t('skuPage.noRowsMsg') }}
      </div>
      <table v-else class="w-full text-sm">
        <thead class="text-xs uppercase tracking-wider text-cream-500 bg-cream-100/60 border-b border-cream-200">
          <tr>
            <th class="px-5 py-3 text-left font-medium">{{ $t('skuPage.columns.channel') }}</th>
            <th class="px-5 py-3 text-left font-medium">{{ $t('skuPage.columns.sku') }}</th>
            <th class="px-5 py-3 text-left font-medium">{{ $t('skuPage.columns.product') }}</th>
            <th class="px-5 py-3 text-right font-medium">{{ $t('skuPage.columns.units') }}</th>
            <th class="px-5 py-3 text-right font-medium">{{ $t('skuPage.columns.gross') }}</th>
            <th class="px-5 py-3 text-right font-medium">{{ $t('skuPage.columns.net') }}</th>
            <th class="px-5 py-3 text-right font-medium">{{ $t('skuPage.columns.cogs') }}</th>
            <th class="px-5 py-3 text-right font-medium">{{ $t('skuPage.columns.cm') }}</th>
            <th class="px-5 py-3 text-right font-medium">{{ $t('skuPage.columns.cmPct') }}</th>
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
