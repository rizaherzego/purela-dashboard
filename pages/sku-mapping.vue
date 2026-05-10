<script setup lang="ts">
definePageMeta({ titleKey: 'skuMappingPage.title' })

interface Mapping {
  id?: number
  channel_id: string
  external_sku: string
  external_product_id: string | null
  internal_sku: string | null
  override_cogs?: number | null
}

const { data, pending, error, refresh } = await useFetch<{ mappings: Mapping[] }>('/api/reference/sku-mapping')

const filterUnmapped = ref(false)
const search = ref('')

const filtered = computed(() => {
  let rows = data.value?.mappings ?? []
  if (filterUnmapped.value) rows = rows.filter(r => !r.internal_sku)
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    rows = rows.filter(r =>
      r.external_sku.toLowerCase().includes(q) ||
      (r.internal_sku ?? '').toLowerCase().includes(q),
    )
  }
  return rows
})

const formOpen = ref(false)
const editingMapping = ref<Mapping | null>(null)
const suggesterOpen = ref(false)

function openNewForm() {
  editingMapping.value = null
  formOpen.value = true
}

function openEditForm(mapping: Mapping) {
  editingMapping.value = mapping
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editingMapping.value = null
}

async function onSaved() {
  await refresh()
}

async function onDeleted() {
  await refresh()
}

async function onSuggesterSaved() {
  await refresh()
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <p class="text-sm text-cream-600 max-w-2xl leading-relaxed">
        {{ $t('skuMappingPage.intro') }}
      </p>
      <div class="flex items-center gap-2">
        <EtlRebuildButton :label="$t('skuMappingPage.rerunEtl')" />
        <button
          class="px-3.5 py-2 text-sm border border-cream-200 hover:bg-cream-100 text-cream-700 rounded-md font-medium transition"
          @click="suggesterOpen = true"
        >
          {{ $t('skuMappingPage.suggestMappings') }}
        </button>
        <button
          class="px-3.5 py-2 text-sm bg-clay-500 hover:bg-clay-600 text-white rounded-md font-medium transition"
          @click="openNewForm"
        >
          {{ $t('skuMappingPage.addMapping') }}
        </button>
      </div>
    </div>

    <SkuMappingForm
      :is-open="formOpen"
      :is-editing="editingMapping != null"
      :initial-data="editingMapping ?? undefined"
      @close="closeForm"
      @saved="onSaved"
      @deleted="onDeleted"
    />

    <SkuMappingSuggester
      :is-open="suggesterOpen"
      @close="suggesterOpen = false"
      @saved="onSuggesterSaved"
    />

    <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <input
        v-model="search"
        :placeholder="$t('skuMappingPage.searchPlaceholder')"
        class="px-3.5 py-2 bg-white border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500 transition w-full sm:w-64"
      >
      <label class="inline-flex items-center gap-2 text-sm text-cream-600">
        <input v-model="filterUnmapped" type="checkbox" class="rounded text-clay-500 focus:ring-clay-500">
        {{ $t('skuMappingPage.showUnmappedOnly') }}
      </label>
    </div>

    <div class="bg-white border border-cream-200 rounded-lg overflow-hidden shadow-card">
      <div v-if="pending" class="p-12 text-center text-sm text-cream-400">{{ $t('common.loading') }}</div>
      <div v-else-if="error" class="p-12 text-center text-sm text-clay-700">{{ error.message }}</div>
      <div v-else-if="!filtered.length" class="p-12 text-center text-sm text-cream-500">{{ $t('skuMappingPage.noMappings') }}</div>
      <div v-else class="overflow-x-auto">
      <table class="w-full text-sm min-w-[640px]">
        <thead class="text-xs uppercase tracking-wider text-cream-500 bg-cream-100/60 border-b border-cream-200">
          <tr>
            <th class="px-5 py-3 text-left font-medium">{{ $t('skuMappingPage.columns.channel') }}</th>
            <th class="px-5 py-3 text-left font-medium">{{ $t('skuMappingPage.columns.externalSku') }}</th>
            <th class="px-5 py-3 text-left font-medium">{{ $t('skuMappingPage.columns.externalProductId') }}</th>
            <th class="px-5 py-3 text-left font-medium">{{ $t('skuMappingPage.columns.internalSku') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-200">
          <tr
            v-for="m in filtered"
            :key="m.id ?? (m.channel_id + m.external_sku)"
            class="hover:bg-cream-100 cursor-pointer transition"
            :class="{ 'bg-clay-50/30': !m.internal_sku }"
            @click="openEditForm(m)"
          >
            <td class="px-5 py-3 text-cream-500">{{ m.channel_id }}</td>
            <td class="px-5 py-3 font-mono text-xs text-cream-700">{{ m.external_sku }}</td>
            <td class="px-5 py-3 text-cream-500 font-mono text-xs">{{ m.external_product_id || '—' }}</td>
            <td class="px-5 py-3">
              <span v-if="m.internal_sku" class="font-mono text-xs text-cream-700">{{ m.internal_sku }}</span>
              <span v-else class="text-xs text-clay-600">{{ $t('skuMappingPage.unmapped') }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  </div>
</template>
