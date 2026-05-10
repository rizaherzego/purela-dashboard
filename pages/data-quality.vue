<script setup lang="ts">
definePageMeta({ titleKey: 'nav.dataQuality' })
const { t } = useI18n()
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
      label: t('dataQuality.summary.unmappedLabel'),
      icon: 'lucide:link-2-off',
      count: data.value.unmapped_skus.length,
      tone: data.value.unmapped_skus.length > 0 ? 'warn' : 'ok',
      desc: t('dataQuality.summary.unmappedDesc'),
    },
    {
      key: 'missing_cogs',
      label: t('dataQuality.summary.missingCogsLabel'),
      icon: 'lucide:dollar-sign',
      count: data.value.missing_cogs.length,
      tone: data.value.missing_cogs.length > 0 ? 'warn' : 'ok',
      desc: t('dataQuality.summary.missingCogsDesc'),
    },
    {
      key: 'unsettled',
      label: t('dataQuality.summary.unsettledLabel'),
      icon: 'lucide:clock',
      count: data.value.unsettled_orders.length,
      tone: 'neutral',
      desc: t('dataQuality.summary.unsettledDesc'),
    },
    {
      key: 'undefined_bundles',
      label: t('dataQuality.summary.undefinedBundlesLabel'),
      icon: 'lucide:boxes',
      count: data.value.undefined_bundles.length,
      tone: data.value.undefined_bundles.length > 0 ? 'warn' : 'ok',
      desc: t('dataQuality.summary.undefinedBundlesDesc'),
    },
  ]
})
</script>

<template>
  <div class="space-y-8">
    <p class="text-sm text-cream-600 max-w-2xl leading-relaxed">
      <i18n-t keypath="dataQuality.intro" tag="span">
        <template #emph>
          <em class="not-italic text-cream-700">{{ $t('dataQuality.introEmph') }}</em>
        </template>
      </i18n-t>
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

    <section v-if="data?.unmapped_skus?.length" class="bg-white border border-cream-200 rounded-lg overflow-hidden shadow-card">
      <div class="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
        <h3 class="display text-base">{{ $t('dataQuality.unmappedTitle') }}</h3>
        <NuxtLink to="/sku-mapping" class="text-xs text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('dataQuality.unmappedResolveLink') }}</NuxtLink>
      </div>
      <div class="overflow-x-auto">
      <table class="w-full text-sm min-w-[680px]">
        <thead class="text-xs uppercase tracking-wider text-cream-500 bg-cream-100/60">
          <tr>
            <th class="px-5 py-2.5 text-left font-medium">{{ $t('dataQuality.columns.channel') }}</th>
            <th class="px-5 py-2.5 text-left font-medium">{{ $t('dataQuality.columns.externalSku') }}</th>
            <th class="px-5 py-2.5 text-right font-medium">{{ $t('dataQuality.columns.lines') }}</th>
            <th class="px-5 py-2.5 text-right font-medium">{{ $t('dataQuality.columns.impactedGmv') }}</th>
            <th class="px-5 py-2.5 text-left font-medium">{{ $t('dataQuality.columns.lastSeen') }}</th>
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
      </div>
    </section>

    <section v-if="data?.missing_cogs?.length" class="bg-white border border-cream-200 rounded-lg overflow-hidden shadow-card">
      <div class="px-6 py-4 border-b border-cream-200 flex items-center justify-between">
        <h3 class="display text-base">{{ $t('dataQuality.missingCogsTitle') }}</h3>
        <NuxtLink to="/products" class="text-xs text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('dataQuality.missingCogsLink') }}</NuxtLink>
      </div>
      <div class="overflow-x-auto">
      <table class="w-full text-sm min-w-[680px]">
        <thead class="text-xs uppercase tracking-wider text-cream-500 bg-cream-100/60">
          <tr>
            <th class="px-5 py-2.5 text-left font-medium">{{ $t('dataQuality.columns.channel') }}</th>
            <th class="px-5 py-2.5 text-left font-medium">{{ $t('dataQuality.columns.sku') }}</th>
            <th class="px-5 py-2.5 text-left font-medium">{{ $t('dataQuality.columns.product') }}</th>
            <th class="px-5 py-2.5 text-right font-medium">{{ $t('dataQuality.columns.lines') }}</th>
            <th class="px-5 py-2.5 text-right font-medium">{{ $t('dataQuality.columns.impactedGmv') }}</th>
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
      </div>
    </section>

    <section v-if="data?.errors?.length" class="text-xs text-clay-700 space-y-1">
      <p v-for="(msg, i) in data.errors" :key="i">{{ msg }}</p>
    </section>
  </div>
</template>
