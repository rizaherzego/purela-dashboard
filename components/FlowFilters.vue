<script setup lang="ts">
const props = defineProps<{
  channels: string[]
  skus: string[]
}>()
const emit = defineEmits<{
  'update:channels': [value: string[]]
  'update:skus': [value: string[]]
}>()

const { t } = useI18n()

const CHANNEL_OPTIONS = computed(() => [
  { id: 'tiktok_shop', label: t('nav.channelLabels.tiktok'),    icon: 'lucide:shopping-bag' },
  { id: 'shopee',      label: t('nav.channelLabels.shopee'),    icon: 'lucide:store' },
  { id: 'tokopedia',   label: t('nav.channelLabels.tokopedia'), icon: 'lucide:shopping-cart' },
  { id: 'website',     label: t('nav.channelLabels.website'),   icon: 'lucide:globe' },
])

function toggleChannel(id: string) {
  const current = [...props.channels]
  const idx = current.indexOf(id)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(id)
  emit('update:channels', current)
}

function clearChannels() {
  emit('update:channels', [])
}

const skuSearch = ref('')
const skuDropdownOpen = ref(false)

const { data: productsData } = await useFetch('/api/reference/products')
const allProducts = computed(() => productsData.value?.products ?? [])

const filteredProducts = computed(() => {
  const q = skuSearch.value.toLowerCase().trim()
  if (!q) return allProducts.value.slice(0, 50)
  return allProducts.value
    .filter((p: any) =>
      p.sku?.toLowerCase().includes(q) ||
      p.product_name?.toLowerCase().includes(q)
    )
    .slice(0, 50)
})

function toggleSku(sku: string) {
  const current = [...props.skus]
  const idx = current.indexOf(sku)
  if (idx >= 0) current.splice(idx, 1)
  else current.push(sku)
  emit('update:skus', current)
}

function removeSku(sku: string) {
  emit('update:skus', props.skus.filter(s => s !== sku))
}

function clearSkus() {
  emit('update:skus', [])
  skuSearch.value = ''
}

function isSkuSelected(sku: string) {
  return props.skus.includes(sku)
}

const skuContainer = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent) {
  if (skuContainer.value && !skuContainer.value.contains(e.target as Node)) {
    skuDropdownOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div class="bg-white border border-cream-200 rounded-lg px-4 py-3 shadow-card flex flex-wrap items-start gap-x-6 gap-y-3">
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center gap-1.5 text-cream-500">
        <Icon name="lucide:radio-tower" class="size-3.5" />
        <span class="text-xs uppercase tracking-wider font-medium">{{ $t('flowPage.filtersChannel') }}</span>
        <button
          v-if="channels.length > 0"
          type="button"
          class="text-[10px] text-clay-600 hover:text-clay-800 ml-1"
          @click="clearChannels"
        >
          {{ $t('common.clear') }}
        </button>
      </div>
      <div class="flex items-center gap-1">
        <button
          v-for="ch in CHANNEL_OPTIONS"
          :key="ch.id"
          type="button"
          class="text-xs px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1.5"
          :class="channels.includes(ch.id)
            ? 'bg-clay-500 text-white border-clay-500'
            : channels.length === 0
              ? 'bg-cream-50 text-cream-600 border-cream-200 hover:bg-cream-100 hover:text-cream-800'
              : 'bg-white text-cream-400 border-cream-200 hover:bg-cream-50 hover:text-cream-700'"
          @click="toggleChannel(ch.id)"
        >
          <Icon :name="ch.icon" class="size-3" />
          {{ ch.label }}
        </button>
      </div>
    </div>

    <div class="w-px h-12 bg-cream-200 self-center hidden sm:block" />

    <div ref="skuContainer" class="flex flex-col gap-1.5 flex-1 min-w-0 sm:min-w-[240px] w-full">
      <div class="flex items-center gap-1.5 text-cream-500">
        <Icon name="lucide:package" class="size-3.5" />
        <span class="text-xs uppercase tracking-wider font-medium">{{ $t('flowPage.filtersProductSku') }}</span>
        <button
          v-if="skus.length > 0"
          type="button"
          class="text-[10px] text-clay-600 hover:text-clay-800 ml-1"
          @click="clearSkus"
        >
          {{ $t('common.clear') }}
        </button>
      </div>

      <div class="flex flex-wrap gap-1">
        <span
          v-for="sku in skus"
          :key="sku"
          class="inline-flex items-center gap-1 bg-clay-50 text-clay-700 text-xs px-2 py-0.5 rounded-md border border-clay-200"
        >
          {{ sku }}
          <button
            type="button"
            class="hover:text-clay-900"
            @click="removeSku(sku)"
          >
            <Icon name="lucide:x" class="size-3" />
          </button>
        </span>

        <div class="relative w-full sm:w-auto">
          <input
            v-model="skuSearch"
            type="text"
            :placeholder="skus.length ? $t('flowPage.filtersAddMore') : $t('flowPage.filtersSearchPlaceholder')"
            class="border border-cream-200 rounded-md px-2.5 py-1 text-xs text-cream-700 bg-white focus:outline-none focus:border-clay-500 w-full sm:w-48"
            @focus="skuDropdownOpen = true"
          />

          <div
            v-if="skuDropdownOpen && filteredProducts.length > 0"
            class="absolute left-0 top-full mt-1 w-full sm:w-72 max-h-56 overflow-y-auto bg-white border border-cream-200 rounded-md shadow-pop z-20 py-1"
          >
            <button
              v-for="product in filteredProducts"
              :key="product.sku"
              type="button"
              class="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-cream-50 transition-colors"
              :class="isSkuSelected(product.sku) ? 'bg-clay-50 text-clay-700' : 'text-cream-700'"
              @click="toggleSku(product.sku)"
            >
              <Icon
                :name="isSkuSelected(product.sku) ? 'lucide:check-square' : 'lucide:square'"
                class="size-3.5 shrink-0"
                :class="isSkuSelected(product.sku) ? 'text-clay-600' : 'text-cream-400'"
              />
              <span class="font-mono text-cream-500">{{ product.sku }}</span>
              <span class="truncate">{{ product.product_name }}</span>
            </button>
            <div v-if="filteredProducts.length >= 50" class="px-3 py-1.5 text-[10px] text-cream-400 border-t border-cream-100">
              {{ $t('flowPage.filtersFirst50') }}
            </div>
          </div>

          <div
            v-if="skuDropdownOpen && filteredProducts.length === 0 && skuSearch"
            class="absolute left-0 top-full mt-1 w-full sm:w-72 bg-white border border-cream-200 rounded-md shadow-pop z-20 py-3 px-3 text-xs text-cream-500 text-center"
          >
            {{ $t('flowPage.filtersNoMatch', { q: skuSearch }) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
