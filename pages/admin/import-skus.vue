<script setup lang="ts">
definePageMeta({ titleKey: 'adminImportSkus.title' })

const { t } = useI18n()
const { formatNumber } = useFormat()

interface PreviewProduct {
  excel_row: number
  suggested_sku: string
  product_name: string
  raw_name: string
  category: string | null
  netto: string
  hpp: number | null
  biaya_lain: number | null
  rsp: number | null
  bottom_price: number | null
}

interface PreviewComponent {
  excel_row: number
  raw_name: string
  raw_netto: string | number | null
  suggested_component_sku: string | null
  is_free: boolean
  confidence: 'high' | 'medium' | 'low'
  reason: string
  skip_by_default: boolean
}

interface PreviewBundle {
  excel_row: number
  excel_no: number | null
  suggested_bundle_sku: string
  bundle_name: string
  bottom_price: number | null
  mark_up: number | null
  components: PreviewComponent[]
}

interface PreviewResponse {
  file_name: string
  products: PreviewProduct[]
  bundles: PreviewBundle[]
  warnings: string[]
  stats: {
    products_count: number
    bundles_count: number
    components_total: number
    components_high_confidence: number
    components_skip_by_default: number
  }
}

interface CommitResponse {
  products_loaded: number
  bundles_loaded: number
  product_costs_loaded: number
  components_loaded: number
  components_skipped: number
}

const file = ref<File | null>(null)
const stagingError = ref<string | null>(null)
const staging = ref(false)

const preview = ref<PreviewResponse | null>(null)
const products = ref<PreviewProduct[]>([])
const bundles = ref<PreviewBundle[]>([])

const activeTab = ref<'products' | 'bundles'>('products')

const committing = ref(false)
const commitError = ref<string | null>(null)
const commitResult = ref<CommitResponse | null>(null)

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
  stagingError.value = null
}

async function stage() {
  if (!file.value) return
  staging.value = true
  stagingError.value = null
  const fd = new FormData()
  fd.append('file', file.value)
  try {
    const result = await $fetch<PreviewResponse>('/api/admin/skus/preview', { method: 'POST', body: fd })
    preview.value = result
    products.value = result.products
    bundles.value = result.bundles
  }
  catch (e: any) {
    stagingError.value = e?.statusMessage || e?.message || t('errors.parseFailed')
  }
  finally {
    staging.value = false
  }
}

function reset() {
  preview.value = null
  products.value = []
  bundles.value = []
  file.value = null
  commitResult.value = null
  commitError.value = null
}

async function commit() {
  if (!preview.value) return
  committing.value = true
  commitError.value = null
  try {
    const payload = {
      products: products.value.map(p => ({
        sku: p.suggested_sku,
        product_name: p.product_name,
        category: p.category,
        netto: p.netto,
        hpp: p.hpp,
        biaya_lain: p.biaya_lain,
        rsp: p.rsp,
        bottom_price: p.bottom_price,
      })),
      bundles: bundles.value.map(b => ({
        bundle_sku: b.suggested_bundle_sku,
        bundle_name: b.bundle_name,
        bottom_price: b.bottom_price,
        mark_up: b.mark_up,
        components: b.components.map(c => ({
          component_sku: c.suggested_component_sku,
          is_free: c.is_free,
          skip: c.skip_by_default,
        })),
      })),
    }
    const result = await $fetch<CommitResponse>('/api/admin/skus/commit', {
      method: 'POST',
      body: payload,
    })
    commitResult.value = result
  }
  catch (e: any) {
    commitError.value = e?.statusMessage || e?.message || t('errors.commitFailed')
  }
  finally {
    committing.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div
      v-if="commitResult"
      class="bg-white border border-cream-200 rounded-lg p-7 max-w-xl space-y-5 shadow-card"
    >
      <div class="flex items-center gap-3">
        <div class="size-9 rounded-full bg-clay-50 flex items-center justify-center">
          <Icon name="lucide:check" class="size-5 text-clay-600" />
        </div>
        <h2 class="display text-lg">{{ $t('adminImportSkus.successTitle') }}</h2>
      </div>
      <dl class="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-3 text-sm">
        <dt class="text-cream-500">{{ $t('adminImportSkus.fields.products') }}</dt>
        <dd class="text-cream-800">{{ formatNumber(commitResult.products_loaded) }}</dd>
        <dt class="text-cream-500">{{ $t('adminImportSkus.fields.bundles') }}</dt>
        <dd class="text-cream-800">{{ formatNumber(commitResult.bundles_loaded) }}</dd>
        <dt class="text-cream-500">{{ $t('adminImportSkus.fields.costRows') }}</dt>
        <dd class="text-cream-800">{{ formatNumber(commitResult.product_costs_loaded) }}</dd>
        <dt class="text-cream-500">{{ $t('adminImportSkus.fields.components') }}</dt>
        <dd class="text-cream-800">
          {{ $t('adminImportSkus.fields.componentsValue', { loaded: formatNumber(commitResult.components_loaded), skipped: formatNumber(commitResult.components_skipped) }) }}
        </dd>
      </dl>
      <div class="flex flex-wrap items-center gap-3 pt-2">
        <NuxtLink
          to="/sku-mapping"
          class="px-4 py-2 bg-clay-500 hover:bg-clay-600 text-white rounded-md text-sm font-medium"
        >
          {{ $t('adminImportSkus.mapSellerSkus') }}
        </NuxtLink>
        <EtlRebuildButton :label="$t('adminImportSkus.rerunOnExisting')" />
        <button
          class="px-4 py-2 border border-cream-200 text-cream-700 hover:bg-cream-100 rounded-md text-sm font-medium"
          @click="reset"
        >
          {{ $t('adminImportSkus.uploadAnother') }}
        </button>
      </div>
      <p class="text-xs text-cream-500 leading-relaxed">
        <i18n-t keypath="adminImportSkus.tipPostMap" tag="span">
          <template #rerunBold><strong>{{ $t('howItWorks.step4RerunBold') }}</strong></template>
          <template #factOrders><span class="font-mono">fact_orders</span></template>
        </i18n-t>
      </p>
    </div>

    <template v-else-if="preview">
      <div class="bg-white border border-cream-200 rounded-lg p-7 shadow-card space-y-5">
        <div class="flex items-start justify-between gap-6">
          <div>
            <h2 class="display text-lg mb-2">{{ $t('adminImportSkus.previewHeader', { file: preview.file_name }) }}</h2>
            <p class="text-sm text-cream-600 max-w-xl leading-relaxed">
              {{ $t('adminImportSkus.previewIntro') }}
            </p>
          </div>
          <button
            class="text-sm text-cream-500 hover:text-cream-800 transition"
            @click="reset"
          >
            {{ $t('adminImportSkus.pickAnother') }}
          </button>
        </div>

        <dl class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt class="text-xs uppercase tracking-wider text-cream-500">{{ $t('adminImportSkus.stats.products') }}</dt>
            <dd class="display text-2xl">{{ formatNumber(preview.stats.products_count) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-cream-500">{{ $t('adminImportSkus.stats.bundles') }}</dt>
            <dd class="display text-2xl">{{ formatNumber(preview.stats.bundles_count) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-cream-500">{{ $t('adminImportSkus.stats.components') }}</dt>
            <dd class="display text-2xl">{{ formatNumber(preview.stats.components_total) }}</dd>
          </div>
          <div>
            <dt class="text-xs uppercase tracking-wider text-cream-500">{{ $t('adminImportSkus.stats.highConf') }}</dt>
            <dd class="display text-2xl">{{ formatNumber(preview.stats.components_high_confidence) }}</dd>
          </div>
        </dl>

        <div v-if="preview.warnings.length" class="p-3 bg-clay-50 border border-clay-100 rounded-md">
          <p class="text-xs font-medium text-clay-900 mb-1">{{ $t('adminImportSkus.warningsTitle') }}</p>
          <ul class="text-xs text-clay-800 space-y-0.5 list-disc list-inside">
            <li v-for="w in preview.warnings" :key="w">{{ w }}</li>
          </ul>
        </div>
      </div>

      <div class="flex border-b border-cream-200">
        <button
          class="px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px"
          :class="activeTab === 'products' ? 'border-clay-500 text-clay-700' : 'border-transparent text-cream-500 hover:text-cream-800'"
          @click="activeTab = 'products'"
        >
          {{ $t('adminImportSkus.tabsProducts', { n: products.length }) }}
        </button>
        <button
          class="px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px"
          :class="activeTab === 'bundles' ? 'border-clay-500 text-clay-700' : 'border-transparent text-cream-500 hover:text-cream-800'"
          @click="activeTab = 'bundles'"
        >
          {{ $t('adminImportSkus.tabsBundles', { n: bundles.length }) }}
        </button>
      </div>

      <SkuImportProductsTable v-if="activeTab === 'products'" v-model="products" />
      <SkuImportBundlesPanel
        v-else
        v-model="bundles"
        :products="products.map(p => ({ suggested_sku: p.suggested_sku, product_name: p.product_name, netto: p.netto }))"
      />

      <div class="bg-white border border-cream-200 rounded-lg p-5 shadow-card flex items-center gap-4">
        <button
          class="px-5 py-2.5 bg-clay-500 hover:bg-clay-600 disabled:bg-clay-300 text-white rounded-md text-sm font-medium transition-colors"
          :disabled="committing"
          @click="commit"
        >
          {{ committing ? $t('adminImportSkus.committing') : $t('adminImportSkus.commitToDb') }}
        </button>
        <p v-if="commitError" class="text-sm text-clay-700">{{ commitError }}</p>
        <p v-else class="text-xs text-cream-500">
          <i18n-t keypath="adminImportSkus.commitNote" tag="span">
            <template #productsTable><span class="font-mono">products</span></template>
            <template #costsTable><span class="font-mono">product_costs</span></template>
            <template #bundlesTable><span class="font-mono">bundles</span></template>
            <template #componentsTable><span class="font-mono">bundle_components</span></template>
          </i18n-t>
        </p>
      </div>
    </template>

    <form
      v-else
      class="bg-white border border-cream-200 rounded-lg p-7 space-y-6 max-w-xl shadow-card"
      @submit.prevent="stage"
    >
      <div>
        <h2 class="display text-lg mb-2">{{ $t('adminImportSkus.uploadHeader') }}</h2>
        <p class="text-sm text-cream-600 leading-relaxed">
          <i18n-t keypath="adminImportSkus.uploadIntro" tag="span">
            <template #file><span class="font-mono text-xs bg-cream-100 px-1.5 py-0.5 rounded">SKU Purela.xlsx</span></template>
            <template #pattern><span class="font-mono">PUR-{abbrev}-{size}</span></template>
          </i18n-t>
        </p>
      </div>

      <div>
        <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-2">{{ $t('adminImportSkus.fileLabel') }}</label>
        <input
          type="file"
          accept=".xlsx,.xls"
          class="block w-full text-sm text-cream-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-clay-50 file:text-clay-700 hover:file:bg-clay-100"
          @change="onFile"
        >
        <p class="mt-2 text-xs text-cream-400">{{ $t('adminImportSkus.fileXlsxOnly') }}</p>
      </div>

      <p v-if="stagingError" class="text-sm text-clay-700">{{ stagingError }}</p>

      <button
        type="submit"
        class="px-5 py-2.5 bg-clay-500 hover:bg-clay-600 disabled:bg-clay-300 text-white rounded-md text-sm font-medium transition-colors"
        :disabled="!file || staging"
      >
        {{ staging ? $t('adminImportSkus.parsing') : $t('adminImportSkus.preview') }}
      </button>
    </form>
  </div>
</template>
