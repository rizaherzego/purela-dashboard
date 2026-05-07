<script setup lang="ts">
definePageMeta({ title: 'Overview' })

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
      label: 'Effective take rate',
      value: formatPercent(c.effective_take_rate),
      tooltip: 'Share of GMV the marketplace keeps in fees, discounts, and returns. (gross − net) ÷ gross.',
      icon: 'lucide:percent',
    },
    {
      label: 'Contribution margin',
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
  <div class="space-y-8">
    <!-- Freshness -->
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

    <!-- Chart slots -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <h2 class="display text-base mb-1">GMV vs Net Settlement vs Margin</h2>
        <p class="text-xs text-cream-500 mb-5">Weekly buckets, last 6 months</p>
        <div class="h-48 flex items-center justify-center text-xs text-cream-400 bg-cream-50 border border-cream-100 rounded-md">
          Trend chart wires up next turn
        </div>
      </section>
      <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
        <h2 class="display text-base mb-1">Fee waterfall</h2>
        <p class="text-xs text-cream-500 mb-5">Last fully-settled month</p>
        <div class="h-48 flex items-center justify-center text-xs text-cream-400 bg-cream-50 border border-cream-100 rounded-md">
          Waterfall wires up next turn
        </div>
      </section>
    </div>

    <section class="bg-white border border-cream-200 rounded-lg p-6 shadow-card">
      <h2 class="display text-base mb-1">Channel breakdown</h2>
      <p class="text-xs text-cream-500 mb-5">Contribution margin per channel per month</p>
      <div class="h-40 flex items-center justify-center text-xs text-cream-400 bg-cream-50 border border-cream-100 rounded-md">
        Stacked bar wires up next turn
      </div>
    </section>
  </div>
</template>
