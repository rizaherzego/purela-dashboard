<script setup lang="ts">
definePageMeta({ title: 'Data Quality' })
const { formatIDRCompact, formatNumber } = useFormat()

interface DqResponse {
  unmapped_skus: any[]
  missing_cogs: any[]
  unsettled_orders: any[]
  undefined_bundles: any[]
  errors: string[]
}

const { data, pending, error } = await useFetch<DqResponse>('/api/metrics/data-quality')

const summary = computed(() => {
  if (!data.value) return []
  return [
    {
      key: 'unmapped',
      label: 'Unmapped SKUs',
      icon: 'lucide:link-2-off',
      count: data.value.unmapped_skus.length,
      tone: data.value.unmapped_skus.length > 0 ? 'warn' : 'ok',
      desc: 'External SKUs in imports without an internal SKU mapping',
    },
    {
      key: 'missing_cogs',
      label: 'Missing COGS',
      icon: 'lucide:dollar-sign',
      count: data.value.missing_cogs.length,
      tone: data.value.missing_cogs.length > 0 ? 'warn' : 'ok',
      desc: 'Mapped SKUs that lack a cost record — margins are unreliable',
    },
    {
      key: 'unsettled',
      label: 'Unsettled orders',
      icon: 'lucide:clock',
      count: data.value.unsettled_orders.length,
      tone: 'neutral',
      desc: 'Orders without a matching settlement row yet',
    },
    {
      key: 'undefined_bundles',
      label: 'Undefined bundles',
      icon: 'lucide:boxes',
      count: data.value.undefined_bundles.length,
      tone: data.value.undefined_bundles.length > 0 ? 'warn' : 'ok',
      desc: 'Multi-SKU strings used in mappings that aren\'t defined as bundles',
    },
  ]
})
</script>

<template>
  <div class="space-y-8">
    <p class="text-sm text-cream-600 max-w-2xl leading-relaxed">
      What the dashboard <em class="not-italic text-cream-700">can't</em> tell you yet.
      Every number on the Overview page assumes these warnings are at zero — anything below
      is a known gap.
    </p>

    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="h-32 bg-white border border-cream-200 rounded-lg animate-pulse" />
    </div>
    <p v-else-if="error" class="text-sm text-clay-700">{{ error.message }}</p>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div
        v-for="s in summary"
        :key="s.key"
        class="bg-white border border-cream-200 rounded-lg p-5 shadow-card"
      >
        <div class="flex items-center justify-between mb-4">
          <span class="text-xs uppercase tracking-wider text-cream-500 font-medium">{{ s.label }}</span>
          <Icon
            :name="s.icon"
            class="size-4"
            :class="{
              'text-clay-500': s.tone === 'warn',
              'text-cream-400': s.tone !== 'warn',
            }"
          />
        </div>
        <div class="display text-2xl"
          :class="{
            'text-clay-700': s.tone === 'warn',
            'text-cream-900': s.tone !== 'warn',
          }"
        >
          {{ formatNumber(s.count) }}
        </div>
        <p class="mt-2 text-xs text-cream-500 leading-relaxed">{{ s.desc }}</p>
      </div>
    </div>

    <!-- Detail tables -->
    <section v-if="data?.unmapped_skus?.length" class="bg-white border border-cream-200 rounded-lg overflow-hidden shadow-card">
      <div class="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
        <h3 class="display text-base">Unmapped SKUs</h3>
        <NuxtLink to="/sku-mapping" class="text-xs text-clay-600 hover:text-clay-700 underline underline-offset-2">Resolve in SKU mapping →</NuxtLink>
      </div>
      <table class="w-full text-sm">
        <thead class="text-xs uppercase tracking-wider text-cream-500 bg-cream-100/60">
          <tr>
            <th class="px-5 py-2.5 text-left font-medium">Channel</th>
            <th class="px-5 py-2.5 text-left font-medium">External SKU</th>
            <th class="px-5 py-2.5 text-right font-medium">Lines</th>
            <th class="px-5 py-2.5 text-right font-medium">Impacted GMV</th>
            <th class="px-5 py-2.5 text-left font-medium">Last seen</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-200">
          <tr v-for="(r, i) in data.unmapped_skus" :key="i">
            <td class="px-5 py-2.5 text-cream-500">{{ r.channel_id }}</td>
            <td class="px-5 py-2.5 font-mono text-xs text-cream-700">{{ r.external_sku }}</td>
            <td class="px-5 py-2.5 text-right text-cream-700">{{ formatNumber(r.line_items) }}</td>
            <td class="px-5 py-2.5 text-right text-cream-700">{{ formatIDRCompact(r.unmapped_gmv) }}</td>
            <td class="px-5 py-2.5 text-cream-500">{{ r.last_seen }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-if="data?.missing_cogs?.length" class="bg-white border border-cream-200 rounded-lg overflow-hidden shadow-card">
      <div class="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
        <h3 class="display text-base">Missing COGS</h3>
        <NuxtLink to="/products" class="text-xs text-clay-600 hover:text-clay-700 underline underline-offset-2">Set COGS in Products →</NuxtLink>
      </div>
      <table class="w-full text-sm">
        <thead class="text-xs uppercase tracking-wider text-cream-500 bg-cream-100/60">
          <tr>
            <th class="px-5 py-2.5 text-left font-medium">Channel</th>
            <th class="px-5 py-2.5 text-left font-medium">SKU</th>
            <th class="px-5 py-2.5 text-left font-medium">Product</th>
            <th class="px-5 py-2.5 text-right font-medium">Lines</th>
            <th class="px-5 py-2.5 text-right font-medium">Impacted GMV</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-200">
          <tr v-for="(r, i) in data.missing_cogs" :key="i">
            <td class="px-5 py-2.5 text-cream-500">{{ r.channel_id }}</td>
            <td class="px-5 py-2.5 font-mono text-xs text-cream-700">{{ r.sku }}</td>
            <td class="px-5 py-2.5 max-w-xs truncate text-cream-700" :title="r.product_name">{{ r.product_name }}</td>
            <td class="px-5 py-2.5 text-right text-cream-700">{{ formatNumber(r.line_items) }}</td>
            <td class="px-5 py-2.5 text-right text-cream-700">{{ formatIDRCompact(r.impacted_gmv) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-if="data?.errors?.length" class="text-xs text-clay-700 space-y-1">
      <p v-for="(msg, i) in data.errors" :key="i">{{ msg }}</p>
    </section>
  </div>
</template>
