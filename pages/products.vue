<script setup lang="ts">
definePageMeta({ titleKey: 'products.title' })
const { formatIDR } = useFormat()

interface Product {
  sku: string
  product_name: string
  category: string | null
  unit_size: string | null
  weight_grams: number | null
  is_bundle: boolean
  is_active: boolean
  current_cogs: number | null
  current_packaging: number | null
}

const { data, pending, error, refresh } = await useFetch<{ products: Product[] }>('/api/reference/products')

const formOpen = ref(false)
const editingProduct = ref<Product | null>(null)

function openNewForm() {
  editingProduct.value = null
  formOpen.value = true
}

function openEditForm(product: Product) {
  editingProduct.value = product
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editingProduct.value = null
}

async function onSaved() {
  await refresh()
}

async function onDeleted() {
  await refresh()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p class="text-sm text-cream-600 max-w-2xl leading-relaxed">
        {{ $t('products.intro') }}
      </p>
      <button
        class="self-start sm:self-auto shrink-0 px-3.5 py-2 text-sm bg-clay-500 hover:bg-clay-600 text-white rounded-md font-medium transition"
        @click="openNewForm"
      >
        {{ $t('products.addProduct') }}
      </button>
    </div>

    <ProductForm
      :is-open="formOpen"
      :is-editing="editingProduct != null"
      :initial-data="editingProduct ?? undefined"
      @close="closeForm"
      @saved="onSaved"
      @deleted="onDeleted"
    />

    <div class="bg-white border border-cream-200 rounded-lg overflow-hidden shadow-card">
      <div v-if="pending" class="p-12 text-center text-sm text-cream-400">{{ $t('common.loading') }}</div>
      <div v-else-if="error" class="p-12 text-center text-sm text-clay-700">{{ error.message }}</div>
      <div v-else-if="!data?.products?.length" class="p-12 text-center text-sm text-cream-500">
        {{ $t('products.noneYet') }} <code class="font-mono bg-cream-100 px-1.5 py-0.5 rounded">products</code> {{ $t('products.viaSql') }}
      </div>
      <div v-else class="overflow-x-auto">
      <table class="w-full text-sm min-w-[720px]">
        <thead class="text-xs uppercase tracking-wider text-cream-500 bg-cream-100/60 border-b border-cream-200">
          <tr>
            <th class="px-5 py-3 text-left font-medium">{{ $t('products.columns.sku') }}</th>
            <th class="px-5 py-3 text-left font-medium">{{ $t('products.columns.name') }}</th>
            <th class="px-5 py-3 text-left font-medium">{{ $t('products.columns.category') }}</th>
            <th class="px-5 py-3 text-left font-medium">{{ $t('products.columns.size') }}</th>
            <th class="px-5 py-3 text-right font-medium">{{ $t('products.columns.cogs') }}</th>
            <th class="px-5 py-3 text-right font-medium">{{ $t('products.columns.packaging') }}</th>
            <th class="px-5 py-3 text-center font-medium">{{ $t('products.columns.bundle') }}</th>
            <th class="px-5 py-3 text-center font-medium">{{ $t('products.columns.active') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-200">
          <tr
            v-for="p in data.products"
            :key="p.sku"
            class="hover:bg-cream-100 cursor-pointer transition"
            @click="openEditForm(p)"
          >
            <td class="px-5 py-3 font-mono text-xs text-cream-700">{{ p.sku }}</td>
            <td class="px-5 py-3 text-cream-700">{{ p.product_name }}</td>
            <td class="px-5 py-3 text-cream-500">{{ p.category || '—' }}</td>
            <td class="px-5 py-3 text-cream-500">{{ p.unit_size || '—' }}</td>
            <td class="px-5 py-3 text-right text-cream-700">{{ formatIDR(p.current_cogs) }}</td>
            <td class="px-5 py-3 text-right text-cream-500">{{ formatIDR(p.current_packaging) }}</td>
            <td class="px-5 py-3 text-center">
              <span v-if="p.is_bundle" class="text-xs text-clay-600">{{ $t('common.yes') }}</span>
              <span v-else class="text-xs text-cream-400">—</span>
            </td>
            <td class="px-5 py-3 text-center">
              <span v-if="p.is_active" class="text-xs text-cream-700">{{ $t('common.active') }}</span>
              <span v-else class="text-xs text-cream-400">{{ $t('common.archived') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  </div>
</template>
