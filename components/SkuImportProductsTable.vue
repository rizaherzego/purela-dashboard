<script setup lang="ts">
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

const props = defineProps<{
  modelValue: PreviewProduct[]
}>()
const emit = defineEmits<{
  'update:modelValue': [value: PreviewProduct[]]
}>()

const rows = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const skuCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const r of rows.value) {
    const sku = (r.suggested_sku ?? '').trim().toUpperCase()
    if (!sku) continue
    counts.set(sku, (counts.get(sku) ?? 0) + 1)
  }
  return counts
})

function isDuplicate(sku: string): boolean {
  const u = sku.trim().toUpperCase()
  return !!u && (skuCounts.value.get(u) ?? 0) > 1
}
</script>

<template>
  <div class="bg-white border border-cream-200 rounded-lg overflow-hidden shadow-card">
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead class="bg-cream-100 text-cream-600 border-b border-cream-200">
          <tr>
            <th class="px-3 py-2.5 text-left font-medium uppercase tracking-wider w-10">#</th>
            <th class="px-3 py-2.5 text-left font-medium uppercase tracking-wider">{{ $t('skuImport.products.columnSku') }}</th>
            <th class="px-3 py-2.5 text-left font-medium uppercase tracking-wider">{{ $t('skuImport.products.columnName') }}</th>
            <th class="px-3 py-2.5 text-left font-medium uppercase tracking-wider">{{ $t('skuImport.products.columnCategory') }}</th>
            <th class="px-3 py-2.5 text-left font-medium uppercase tracking-wider">{{ $t('skuImport.products.columnNetto') }}</th>
            <th class="px-3 py-2.5 text-right font-medium uppercase tracking-wider">{{ $t('skuImport.products.columnHpp') }}</th>
            <th class="px-3 py-2.5 text-right font-medium uppercase tracking-wider">{{ $t('skuImport.products.columnBiayaLain') }}</th>
            <th class="px-3 py-2.5 text-right font-medium uppercase tracking-wider">{{ $t('skuImport.products.columnRsp') }}</th>
            <th class="px-3 py-2.5 text-right font-medium uppercase tracking-wider">{{ $t('skuImport.products.columnBottom') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-200">
          <tr v-for="(r, idx) in rows" :key="r.excel_row" class="hover:bg-cream-50">
            <td class="px-3 py-2 text-cream-400">{{ idx + 1 }}</td>
            <td class="px-2 py-1">
              <input
                v-model="r.suggested_sku"
                type="text"
                class="w-32 px-2 py-1 font-mono text-xs bg-cream-50 border rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition"
                :class="isDuplicate(r.suggested_sku) ? 'border-clay-400 bg-clay-50' : 'border-cream-200'"
                @blur="r.suggested_sku = (r.suggested_sku ?? '').toUpperCase()"
              >
              <p v-if="isDuplicate(r.suggested_sku)" class="text-[10px] text-clay-600 mt-0.5">{{ $t('skuImport.products.duplicate') }}</p>
            </td>
            <td class="px-2 py-1">
              <input
                v-model="r.product_name"
                type="text"
                class="w-56 px-2 py-1 bg-cream-50 border border-cream-200 rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition"
              >
            </td>
            <td class="px-2 py-1">
              <input
                v-model="r.category"
                type="text"
                class="w-28 px-2 py-1 bg-cream-50 border border-cream-200 rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition"
              >
            </td>
            <td class="px-2 py-1">
              <input
                v-model="r.netto"
                type="text"
                class="w-20 px-2 py-1 bg-cream-50 border border-cream-200 rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition"
              >
            </td>
            <td class="px-2 py-1 text-right">
              <input
                v-model.number="r.hpp"
                type="number"
                class="w-24 px-2 py-1 text-right bg-cream-50 border border-cream-200 rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition"
              >
            </td>
            <td class="px-2 py-1 text-right">
              <input
                v-model.number="r.biaya_lain"
                type="number"
                class="w-24 px-2 py-1 text-right bg-cream-50 border border-cream-200 rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition"
              >
            </td>
            <td class="px-2 py-1 text-right">
              <input
                v-model.number="r.rsp"
                type="number"
                class="w-24 px-2 py-1 text-right bg-cream-50 border border-cream-200 rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition"
              >
            </td>
            <td class="px-2 py-1 text-right">
              <input
                v-model.number="r.bottom_price"
                type="number"
                class="w-24 px-2 py-1 text-right bg-cream-50 border border-cream-200 rounded focus:outline-none focus:ring-1 focus:ring-clay-500 transition"
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="px-4 py-2.5 text-xs text-cream-500 border-t border-cream-200 bg-cream-50/50">
      {{ $t('skuImport.products.footer', { n: rows.length }) }}
    </div>
  </div>
</template>
