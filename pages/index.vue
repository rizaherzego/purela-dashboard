<script setup lang="ts">
definePageMeta({ title: 'Profitability Overview' })

const { formatIDRCompact, formatPercent, formatNumber, formatDate } = useFormat()

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

function pctChange(curr: number, prev: number): { text: string, type: 'up' | 'down' | 'neutral' } | null {
  if (!prev || prev === 0) return null
  const delta = (curr - prev) / Math.abs(prev)
  return {
    text: `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}% vs prior 30d`,
    type: delta > 0.001 ? 'up' : delta < -0.001 ? 'down' : 'neutral',
  }
}

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
    },
    {
      label: 'Net Settlement',
      value: formatIDRCompact(c.net_settlement),
      change: pctChange(c.net_settlement, p.net_settlement)?.text,
      changeType: pctChange(c.net_settlement, p.net_settlement)?.type,
      icon: 'lucide:wallet',
    },
    {
      label: 'Effective Take Rate',
      value: formatPercent(c.effective_take_rate),
      tooltip: 'Share of GMV that the marketplace keeps in fees, discounts, and returns. (gross − net) ÷ gross.',
      icon: 'lucide:percent',
    },
    {
      label: 'Contribution Margin',
      value: formatIDRCompact(c.contribution_margin),
      hint: c.contribution_margin_pct != null ? `${formatPercent(c.contribution_margin_pct)} of GMV` : undefined,
      icon: 'lucide:bar-chart-2',
    },
    {
      label: 'Orders',
      value: formatNumber(c.order_count),
      change: pctChange(c.order_count, p.order_count)?.text,
      changeType: pctChange(c.order_count, p.order_count)?.type,
      icon: 'lucide:shopping-cart',
    },
  ]
})
</script>

<template>
  <div class="space-y-5">
    <!-- Freshness -->
    <div v-if="data?.last_import" class="text-xs text-gray-500 flex items-center gap-2">
      <Icon name="lucide:database" class="size-3.5" />
      <span>
        Last import: <span class="font-medium text-gray-700">{{ data.last_import.file_type_id }}</span>
        ({{ data.last_import.channel_id }}) {{ formatDate(data.last_import.imported_at) }}
        — coverage {{ data.last_import.period_start || '?' }} → {{ data.last_import.period_end || '?' }}
      </span>
    </div>
    <div v-else-if="!pending && !error" class="text-xs text-gray-500 flex items-center gap-2">
      <Icon name="lucide:database" class="size-3.5" />
      <span>No imports yet. Visit <NuxtLink to="/upload" class="text-emerald-600 underline">Upload</NuxtLink> to add data.</span>
    </div>

    <!-- KPI cards -->
    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <div v-for="i in 5" :key="i" class="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" />
    </div>
    <p v-else-if="error" class="text-sm text-red-600">{{ error.message }}</p>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <KpiCard
        v-for="card in cards"
        :key="card.label"
        v-bind="card"
      />
    </div>

    <!-- Chart slots -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-1">GMV vs Net Settlement vs Contribution Margin</h2>
        <p class="text-xs text-gray-400 mb-4">Weekly buckets, last 6 months</p>
        <div class="h-48 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
          Trend chart wires up next turn
        </div>
      </div>
      <div class="bg-white rounded-xl border border-gray-200 p-5">
        <h2 class="text-sm font-semibold text-gray-700 mb-1">Fee Waterfall</h2>
        <p class="text-xs text-gray-400 mb-4">Last fully-settled month</p>
        <div class="h-48 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
          Waterfall wires up next turn
        </div>
      </div>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 p-5">
      <h2 class="text-sm font-semibold text-gray-700 mb-1">Channel breakdown</h2>
      <p class="text-xs text-gray-400 mb-4">Contribution margin per channel per month</p>
      <div class="h-40 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-lg">
        Stacked bar wires up next turn
      </div>
    </div>
  </div>
</template>
