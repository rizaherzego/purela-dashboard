<script setup lang="ts">
definePageMeta({ title: 'Bundles' })

interface Bundle {
  bundle_sku: string
  bundle_name: string
  notes: string | null
  components: { component_sku: string, quantity: number }[]
}

const { data, pending, error } = await useFetch<{ bundles: Bundle[] }>('/api/reference/bundles')
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <p class="text-sm text-cream-600 max-w-2xl leading-relaxed">
        Bundle definitions. When a bundle SKU sells, the ETL explodes it into component
        SKUs for COGS and stock reconciliation.
      </p>
      <button class="px-3.5 py-2 text-sm border border-cream-200 rounded-md text-cream-400 cursor-not-allowed" disabled>
        + Define bundle
      </button>
    </div>

    <div v-if="pending" class="p-12 text-center text-sm text-cream-400">Loading…</div>
    <div v-else-if="error" class="p-12 text-center text-sm text-clay-700">{{ error.message }}</div>
    <div v-else-if="!data?.bundles?.length" class="bg-white border border-cream-200 rounded-lg p-12 text-center text-sm text-cream-500 shadow-card">
      No bundles defined yet.
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="b in data.bundles" :key="b.bundle_sku" class="bg-white border border-cream-200 rounded-lg p-5 shadow-card">
        <div class="flex items-baseline justify-between mb-3">
          <h3 class="display text-base">{{ b.bundle_name }}</h3>
          <span class="text-xs font-mono text-cream-500">{{ b.bundle_sku }}</span>
        </div>
        <ul class="space-y-1.5 mt-3 pt-3 border-t border-cream-200">
          <li v-for="c in b.components" :key="c.component_sku" class="flex items-center justify-between text-xs">
            <span class="font-mono text-cream-700">{{ c.component_sku }}</span>
            <span class="text-cream-500">×{{ c.quantity }}</span>
          </li>
        </ul>
        <p v-if="b.notes" class="mt-3 text-xs text-cream-500 italic">{{ b.notes }}</p>
      </div>
    </div>
  </div>
</template>
