<script setup lang="ts">
definePageMeta({ title: 'Products' })
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
    <div class="flex items-center justify-between">
      <p class="text-sm text-cream-600 max-w-2xl leading-relaxed">
        Master product list and current COGS. Click any row to edit.
      </p>
      <button
        class="px-3.5 py-2 text-sm bg-clay-500 hover:bg-clay-600 text-white rounded-md font-medium transition"
        @click="openNewForm"
      >
        + Add product
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
      <div v-if="pending" class="p-12 text-center text-sm text-cream-400">Loading…</div>
      <div v-else-if="error" class="p-12 text-center text-sm text-clay-700">{{ error.message }}</div>
      <div v-else-if="!data?.products?.length" class="p-12 text-center text-sm text-cream-500">
        No products yet. Insert rows into <code class="font-mono bg-cream-100 px-1.5 py-0.5 rounded">products</code> via SQL.
      </div>
      <table v-else class="w-full text-sm">
        <thead class="text-xs uppercase tracking-wider text-cream-500 bg-cream-100/60 border-b border-cream-200">
          <tr>
            <th class="px-5 py-3 text-left font-medium">SKU</th>
            <th class="px-5 py-3 text-left font-medium">Name</th>
            <th class="px-5 py-3 text-left font-medium">Category</th>
            <th class="px-5 py-3 text-left font-medium">Size</th>
            <th class="px-5 py-3 text-right font-medium">COGS</th>
            <th class="px-5 py-3 text-right font-medium">Packaging</th>
            <th class="px-5 py-3 text-center font-medium">Bundle</th>
            <th class="px-5 py-3 text-center font-medium">Active</th>
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
              <span v-if="p.is_bundle" class="text-xs text-clay-600">yes</span>
              <span v-else class="text-xs text-cream-400">—</span>
            </td>
            <td class="px-5 py-3 text-center">
              <span v-if="p.is_active" class="text-xs text-cream-700">active</span>
              <span v-else class="text-xs text-cream-400">archived</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
