<script setup lang="ts">
interface PreviewProduct {
  suggested_sku: string
  product_name: string
  netto: string
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

const props = defineProps<{
  modelValue: PreviewBundle[]
  products: PreviewProduct[]
}>()
const emit = defineEmits<{
  'update:modelValue': [value: PreviewBundle[]]
}>()

const { t } = useI18n()

const bundles = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const productOptions = computed(() =>
  props.products.map(p => ({
    value: p.suggested_sku,
    label: `${p.suggested_sku} — ${p.product_name} (${p.netto || '?'})`,
  })),
)

const filterMode = ref<'all' | 'matched' | 'needs-review'>('all')

const visibleBundles = computed(() => {
  if (filterMode.value === 'all') return bundles.value
  if (filterMode.value === 'matched') {
    return bundles.value.filter(b =>
      b.components.every(c => c.skip_by_default || c.suggested_component_sku),
    )
  }
  return bundles.value.filter(b =>
    b.components.some(c => !c.skip_by_default && !c.suggested_component_sku),
  )
})

function confidenceClass(conf: 'high' | 'medium' | 'low'): string {
  if (conf === 'high') return 'bg-clay-100 text-clay-700'
  if (conf === 'medium') return 'bg-cream-200 text-cream-700'
  return 'bg-cream-100 text-cream-500'
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-3 text-sm">
      <span class="text-cream-500">{{ $t('skuImport.bundles.filterLabel') }}</span>
      <button
        v-for="opt in [{ k: 'all', l: t('skuImport.bundles.filterAll') }, { k: 'needs-review', l: t('skuImport.bundles.filterNeedsReview') }, { k: 'matched', l: t('skuImport.bundles.filterMatched') }]"
        :key="opt.k"
        class="px-3 py-1 rounded-md transition text-xs font-medium"
        :class="filterMode === opt.k ? 'bg-clay-500 text-white' : 'bg-white border border-cream-200 text-cream-700 hover:bg-cream-100'"
        @click="filterMode = opt.k as any"
      >
        {{ opt.l }}
      </button>
      <span class="text-xs text-cream-500">{{ $t('skuImport.bundles.visibleCount', { visible: visibleBundles.length, total: bundles.length }) }}</span>
    </div>

    <div
      v-for="bundle in visibleBundles"
      :key="bundle.excel_row"
      class="bg-white border border-cream-200 rounded-lg p-5 shadow-card space-y-4"
    >
      <div class="grid grid-cols-1 md:grid-cols-[max-content_1fr_max-content_max-content] gap-3 items-center">
        <input
          v-model="bundle.suggested_bundle_sku"
          type="text"
          class="px-2 py-1 font-mono text-xs bg-cream-50 border border-cream-200 rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition w-32"
          @blur="bundle.suggested_bundle_sku = (bundle.suggested_bundle_sku ?? '').toUpperCase()"
        >
        <input
          v-model="bundle.bundle_name"
          type="text"
          class="px-2 py-1 bg-cream-50 border border-cream-200 rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition"
        >
        <div class="flex items-center gap-1.5 text-xs">
          <span class="text-cream-500">{{ $t('skuImport.bundles.bottom') }}</span>
          <input
            v-model.number="bundle.bottom_price"
            type="number"
            class="w-24 px-2 py-1 text-right bg-cream-50 border border-cream-200 rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition"
          >
        </div>
        <div class="flex items-center gap-1.5 text-xs">
          <span class="text-cream-500">{{ $t('skuImport.bundles.rsp') }}</span>
          <input
            v-model.number="bundle.mark_up"
            type="number"
            class="w-24 px-2 py-1 text-right bg-cream-50 border border-cream-200 rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition"
          >
        </div>
      </div>

      <div class="space-y-1.5">
        <div class="grid grid-cols-[max-content_1fr_max-content_1fr_max-content] gap-2 px-1 py-1 text-[10px] uppercase tracking-wider text-cream-500 font-medium">
          <div>{{ $t('skuImport.bundles.colSkip') }}</div>
          <div>{{ $t('skuImport.bundles.colRawComponent') }}</div>
          <div>{{ $t('skuImport.bundles.colNetto') }}</div>
          <div>{{ $t('skuImport.bundles.colMapsTo') }}</div>
          <div>{{ $t('skuImport.bundles.colConf') }}</div>
        </div>
        <div
          v-for="comp in bundle.components"
          :key="comp.excel_row"
          class="grid grid-cols-[max-content_1fr_max-content_1fr_max-content] gap-2 items-center px-1 py-1 rounded transition"
          :class="comp.skip_by_default ? 'opacity-50' : ''"
        >
          <input
            v-model="comp.skip_by_default"
            type="checkbox"
            class="rounded text-clay-500 focus:ring-clay-500"
          >
          <div class="text-xs">
            <span class="text-cream-700">{{ comp.raw_name }}</span>
            <span v-if="comp.is_free" class="ml-1.5 text-[10px] text-clay-600 font-medium">{{ $t('skuImport.bundles.free') }}</span>
          </div>
          <div class="text-xs text-cream-500 font-mono">
            {{ comp.raw_netto ?? '—' }}
          </div>
          <select
            v-model="comp.suggested_component_sku"
            class="text-xs px-2 py-1 bg-cream-50 border border-cream-200 rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition disabled:opacity-40"
            :disabled="comp.skip_by_default"
          >
            <option :value="null">{{ $t('skuImport.bundles.selectProduct') }}</option>
            <option
              v-for="opt in productOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
          <span
            class="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider"
            :class="confidenceClass(comp.confidence)"
            :title="comp.reason"
          >
            {{ comp.confidence }}
          </span>
        </div>
      </div>
    </div>

    <p v-if="visibleBundles.length === 0" class="text-sm text-cream-500 text-center py-8">
      {{ $t('skuImport.bundles.noMatch') }}
    </p>
  </div>
</template>
