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
      desc: 'External SKUs in imports that have no internal SKU mapping',
    },
    {
      key: 'missing_cogs',
      label: 'SKUs missing COGS',
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
  <div class="space-y-5">
    <p class="text-sm text-gray-500 max-w-2xl">
      What the dashboard <em>can't</em> tell you yet. Every number on the Overview page assumes
      these warnings are at zero — anything below is a known gap.
    </p>

    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="h-28 bg-white rounded-xl border border-gray-200 animate-pulse" />
    </div>
    <p v-else-if="error" class="text-sm text-red-600">{{ error.message }}</p>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div
        v-for="s in summary"
        :key="s.key"
        class="bg-white rounded-xl border border-gray-200 p-5"
      >
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-gray-500">{{ s.label }}</span>
          <Icon
            :name="s.icon"
            class="size-5"
            :class="{
              'text-amber-600': s.tone === 'warn',
              'text-emerald-600': s.tone === 'ok',
              'text-gray-400': s.tone === 'neutral',
            }"
          />
        </div>
        <div class="text-2xl font-bold"
          :class="{
            'text-amber-700': s.tone === 'warn',
            'text-emerald-700': s.tone === 'ok',
            'text-gray-900': s.tone === 'neutral',
          }"
        >
          {{ formatNumber(s.count) }}
        </div>
        <p class="mt-1.5 text-xs text-gray-500">{{ s.desc }}</p>
      </div>
    </div>

    <!-- Detail tables -->
    <section v-if="data?.unmapped_skus?.length" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-700">Unmapped SKUs</h3>
        <NuxtLink to="/sku-mapping" class="text-xs text-emerald-600 underline">Resolve in SKU Mapping →</NuxtLink>
      </div>
      <table class="w-full text-sm">
        <thead class="text-xs text-gray-500 uppercase bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left">Channel</th>
            <th class="px-4 py-2 text-left">External SKU</th>
            <th class="px-4 py-2 text-right">Lines</th>
            <th class="px-4 py-2 text-right">Impacted GMV</th>
            <th class="px-4 py-2 text-left">Last seen</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="(r, i) in data.unmapped_skus" :key="i">
            <td class="px-4 py-2 text-gray-500">{{ r.channel_id }}</td>
            <td class="px-4 py-2 font-mono text-xs">{{ r.external_sku }}</td>
            <td class="px-4 py-2 text-right">{{ formatNumber(r.line_items) }}</td>
            <td class="px-4 py-2 text-right">{{ formatIDRCompact(r.unmapped_gmv) }}</td>
            <td class="px-4 py-2 text-gray-500">{{ r.last_seen }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-if="data?.missing_cogs?.length" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-700">SKUs missing COGS</h3>
        <NuxtLink to="/products" class="text-xs text-emerald-600 underline">Set COGS in Products →</NuxtLink>
      </div>
      <table class="w-full text-sm">
        <thead class="text-xs text-gray-500 uppercase bg-gray-50">
          <tr>
            <th class="px-4 py-2 text-left">Channel</th>
            <th class="px-4 py-2 text-left">SKU</th>
            <th class="px-4 py-2 text-left">Product</th>
            <th class="px-4 py-2 text-right">Lines</th>
            <th class="px-4 py-2 text-right">Impacted GMV</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="(r, i) in data.missing_cogs" :key="i">
            <td class="px-4 py-2 text-gray-500">{{ r.channel_id }}</td>
            <td class="px-4 py-2 font-mono text-xs">{{ r.sku }}</td>
            <td class="px-4 py-2 max-w-xs truncate" :title="r.product_name">{{ r.product_name }}</td>
            <td class="px-4 py-2 text-right">{{ formatNumber(r.line_items) }}</td>
            <td class="px-4 py-2 text-right">{{ formatIDRCompact(r.impacted_gmv) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section v-if="data?.errors?.length" class="text-xs text-red-600 space-y-1">
      <p v-for="(msg, i) in data.errors" :key="i">{{ msg }}</p>
    </section>
  </div>
</template>
