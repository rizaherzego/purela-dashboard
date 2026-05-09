<script setup lang="ts">
interface Suggestion {
  channel_id: string
  external_sku: string
  suggested_internal_sku: string | null
  suggested_product_name: string | null
  confidence: 'high' | 'medium' | 'low'
  reason: string
  sample_product_name_from_orders: string | null
  occurrence_count: number
}

interface SuggestResponse {
  channel_id: string
  total_unmapped: number
  suggestions: Suggestion[]
}

interface Product {
  sku: string
  product_name: string
}

const props = defineProps<{
  isOpen: boolean
}>()
const emit = defineEmits<{
  close: []
  saved: []
}>()

const { t } = useI18n()
const { formatNumber } = useFormat()

const channelId = ref('tiktok_shop')
const loading = ref(false)
const error = ref<string | null>(null)
const data = ref<SuggestResponse | null>(null)
const products = ref<Product[]>([])

interface Row extends Suggestion {
  selected_internal_sku: string | null
  skip: boolean
}
const rows = ref<Row[]>([])

const saving = ref(false)
const saveError = ref<string | null>(null)
const saveResult = ref<{ inserted: number, skipped: number } | null>(null)

const filter = ref<'all' | 'high' | 'needs-review'>('all')

const visible = computed(() => {
  if (filter.value === 'high') return rows.value.filter(r => r.confidence === 'high')
  if (filter.value === 'needs-review') return rows.value.filter(r => r.confidence !== 'high')
  return rows.value
})

const confirmedCount = computed(() => rows.value.filter(r => !r.skip && r.selected_internal_sku).length)

watch(() => props.isOpen, async (open) => {
  if (open) await load()
  else reset()
})

async function load() {
  loading.value = true
  error.value = null
  saveResult.value = null
  try {
    const [suggestData, productsData] = await Promise.all([
      $fetch<SuggestResponse>('/api/admin/sku-mapping/suggest', { query: { channel_id: channelId.value } }),
      $fetch<{ products: Product[] }>('/api/reference/products'),
    ])
    data.value = suggestData
    products.value = productsData.products ?? []
    rows.value = suggestData.suggestions.map(s => ({
      ...s,
      selected_internal_sku: s.suggested_internal_sku,
      skip: s.suggested_internal_sku == null,
    }))
  }
  catch (e: any) {
    error.value = e?.statusMessage || e?.message || t('skuSuggester.loadFailed')
  }
  finally {
    loading.value = false
  }
}

function reset() {
  data.value = null
  rows.value = []
  error.value = null
  saveError.value = null
  saveResult.value = null
}

async function save() {
  const toSave = rows.value
    .filter(r => !r.skip && r.selected_internal_sku)
    .map(r => ({
      channel_id: r.channel_id,
      external_sku: r.external_sku,
      internal_sku: r.selected_internal_sku!,
    }))
  if (toSave.length === 0) {
    saveError.value = t('skuSuggester.saveNothingError')
    return
  }
  saving.value = true
  saveError.value = null
  try {
    const res = await $fetch<{ inserted: number, skipped: number }>('/api/admin/sku-mapping/bulk', {
      method: 'POST',
      body: { mappings: toSave },
    })
    saveResult.value = res
    emit('saved')
  }
  catch (e: any) {
    saveError.value = e?.statusMessage || e?.message || t('skuSuggester.saveFailed')
  }
  finally {
    saving.value = false
  }
}

function close() {
  emit('close')
}

function confidenceClass(conf: 'high' | 'medium' | 'low'): string {
  if (conf === 'high') return 'bg-clay-100 text-clay-700'
  if (conf === 'medium') return 'bg-cream-200 text-cream-700'
  return 'bg-cream-100 text-cream-500'
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6"
      @click.self="close"
    >
      <div class="bg-white border border-cream-200 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        <div class="px-7 py-5 border-b border-cream-200 flex items-start justify-between gap-6">
          <div>
            <h2 class="display text-lg">{{ $t('skuSuggester.title') }}</h2>
            <p class="text-sm text-cream-600 mt-1 max-w-2xl leading-relaxed">
              <i18n-t keypath="skuSuggester.intro" tag="span">
                <template #sellerSku><span class="font-mono">seller_sku</span></template>
              </i18n-t>
            </p>
          </div>
          <button class="text-cream-500 hover:text-cream-800 transition" @click="close">
            <Icon name="lucide:x" class="size-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-7 space-y-4">
          <div v-if="loading" class="text-center py-12 text-sm text-cream-500">{{ $t('skuSuggester.loading') }}</div>
          <div v-else-if="error" class="p-4 bg-clay-50 border border-clay-100 rounded-md text-sm text-clay-800">
            {{ error }}
          </div>
          <template v-else-if="data">
            <div v-if="saveResult" class="p-4 bg-clay-50 border border-clay-100 rounded-md text-sm space-y-3">
              <div>
                <p class="text-clay-900 font-medium">
                  {{ saveResult.inserted === 1 ? $t('skuSuggester.savedCountSingular', { n: saveResult.inserted }) : $t('skuSuggester.savedCount', { n: saveResult.inserted }) }}
                </p>
                <p class="text-clay-700 mt-1">{{ $t('skuSuggester.savedHint') }}</p>
              </div>
              <EtlRebuildButton variant="primary" :label="$t('skuSuggester.rerunNow')" />
            </div>

            <div v-if="rows.length === 0" class="text-center py-12 text-sm text-cream-500">
              {{ $t('skuSuggester.allMapped') }}
            </div>

            <template v-else>
              <div class="flex items-center gap-3 text-sm">
                <span class="text-cream-500">{{ $t('skuSuggester.filterLabel') }}</span>
                <button
                  v-for="opt in [{ k: 'all', l: t('skuSuggester.filterAll') }, { k: 'high', l: t('skuSuggester.filterHigh') }, { k: 'needs-review', l: t('skuSuggester.filterNeedsReview') }]"
                  :key="opt.k"
                  class="px-3 py-1 rounded-md transition text-xs font-medium"
                  :class="filter === opt.k ? 'bg-clay-500 text-white' : 'bg-white border border-cream-200 text-cream-700 hover:bg-cream-100'"
                  @click="filter = opt.k as any"
                >
                  {{ opt.l }}
                </button>
                <span class="ml-auto text-xs text-cream-500">
                  {{ $t('skuSuggester.readyToSave', { confirmed: confirmedCount, total: rows.length }) }}
                </span>
              </div>

              <div class="bg-white border border-cream-200 rounded-lg overflow-hidden">
                <table class="w-full text-xs">
                  <thead class="bg-cream-100 text-cream-600 border-b border-cream-200">
                    <tr>
                      <th class="px-3 py-2.5 text-left font-medium uppercase tracking-wider">{{ $t('skuSuggester.columns.skip') }}</th>
                      <th class="px-3 py-2.5 text-left font-medium uppercase tracking-wider">{{ $t('skuSuggester.columns.externalSku') }}</th>
                      <th class="px-3 py-2.5 text-right font-medium uppercase tracking-wider">{{ $t('skuSuggester.columns.hits') }}</th>
                      <th class="px-3 py-2.5 text-left font-medium uppercase tracking-wider">{{ $t('skuSuggester.columns.sampleName') }}</th>
                      <th class="px-3 py-2.5 text-left font-medium uppercase tracking-wider">{{ $t('skuSuggester.columns.mapsTo') }}</th>
                      <th class="px-3 py-2.5 text-left font-medium uppercase tracking-wider">{{ $t('skuSuggester.columns.conf') }}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-cream-200">
                    <tr v-for="row in visible" :key="row.external_sku" :class="row.skip ? 'opacity-50' : ''">
                      <td class="px-3 py-2">
                        <input v-model="row.skip" type="checkbox" class="rounded text-clay-500 focus:ring-clay-500">
                      </td>
                      <td class="px-3 py-2 font-mono text-cream-700 break-all">{{ row.external_sku }}</td>
                      <td class="px-3 py-2 text-right text-cream-500">{{ formatNumber(row.occurrence_count) }}</td>
                      <td class="px-3 py-2 text-cream-600 max-w-xs truncate" :title="row.sample_product_name_from_orders ?? ''">
                        {{ row.sample_product_name_from_orders ?? '—' }}
                      </td>
                      <td class="px-2 py-1">
                        <select
                          v-model="row.selected_internal_sku"
                          class="text-xs px-2 py-1 bg-cream-50 border border-cream-200 rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition disabled:opacity-40 w-full"
                          :disabled="row.skip"
                        >
                          <option :value="null">{{ $t('skuSuggester.selectProduct') }}</option>
                          <option v-for="p in products" :key="p.sku" :value="p.sku">
                            {{ p.sku }} — {{ p.product_name }}
                          </option>
                        </select>
                      </td>
                      <td class="px-3 py-2">
                        <span
                          class="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wider"
                          :class="confidenceClass(row.confidence)"
                          :title="row.reason"
                        >
                          {{ row.confidence }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
          </template>
        </div>

        <div class="px-7 py-4 border-t border-cream-200 bg-cream-50/50 flex items-center gap-3">
          <button
            class="px-5 py-2.5 bg-clay-500 hover:bg-clay-600 disabled:bg-clay-300 text-white rounded-md text-sm font-medium transition-colors"
            :disabled="saving || confirmedCount === 0 || !data"
            @click="save"
          >
            {{ saving ? $t('common.saving') : (confirmedCount === 1 ? $t('skuSuggester.saveButtonSingular', { n: confirmedCount }) : $t('skuSuggester.saveButton', { n: confirmedCount })) }}
          </button>
          <button
            class="px-4 py-2 text-sm text-cream-600 hover:text-cream-900 hover:bg-cream-100 rounded-md transition"
            :disabled="saving"
            @click="close"
          >
            {{ $t('common.close') }}
          </button>
          <p v-if="saveError" class="text-sm text-clay-700 ml-auto">{{ saveError }}</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
