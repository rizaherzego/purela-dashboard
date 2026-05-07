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
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <p class="text-sm text-gray-500 max-w-2xl">
        Bundle definitions. When a bundle SKU sells, the ETL explodes it into component SKUs
        for COGS and stock reconciliation.
      </p>
      <button class="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-400 cursor-not-allowed" disabled>
        + Define bundle (next turn)
      </button>
    </div>

    <div v-if="pending" class="p-8 text-center text-sm text-gray-400">Loading…</div>
    <div v-else-if="error" class="p-8 text-center text-sm text-red-600">{{ error.message }}</div>
    <div v-else-if="!data?.bundles?.length" class="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
      No bundles defined yet.
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="b in data.bundles" :key="b.bundle_sku" class="bg-white rounded-xl border border-gray-200 p-4">
        <div class="flex items-baseline justify-between mb-2">
          <h3 class="text-sm font-semibold text-gray-900">{{ b.bundle_name }}</h3>
          <span class="text-xs font-mono text-gray-500">{{ b.bundle_sku }}</span>
        </div>
        <ul class="space-y-1 mt-2">
          <li v-for="c in b.components" :key="c.component_sku" class="flex items-center justify-between text-xs">
            <span class="font-mono text-gray-600">{{ c.component_sku }}</span>
            <span class="text-gray-500">×{{ c.quantity }}</span>
          </li>
        </ul>
        <p v-if="b.notes" class="mt-3 text-xs text-gray-500 italic">{{ b.notes }}</p>
      </div>
    </div>
  </div>
</template>
