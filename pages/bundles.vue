<script setup lang="ts">
definePageMeta({ titleKey: 'bundles.title' })

interface Bundle {
  bundle_sku: string
  bundle_name: string
  notes: string | null
  components: { component_sku: string, quantity: number }[]
}

const { data, pending, error, refresh } = await useFetch<{ bundles: Bundle[] }>('/api/reference/bundles')

const formOpen = ref(false)
const editingBundle = ref<Bundle | null>(null)

function openNewForm() {
  editingBundle.value = null
  formOpen.value = true
}

function openEditForm(bundle: Bundle) {
  editingBundle.value = bundle
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editingBundle.value = null
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
        {{ $t('bundles.intro') }}
      </p>
      <button
        class="self-start sm:self-auto shrink-0 px-3.5 py-2 text-sm bg-clay-500 hover:bg-clay-600 text-white rounded-md font-medium transition"
        @click="openNewForm"
      >
        {{ $t('bundles.defineBundle') }}
      </button>
    </div>

    <BundleForm
      :is-open="formOpen"
      :is-editing="editingBundle != null"
      :initial-data="editingBundle ?? undefined"
      @close="closeForm"
      @saved="onSaved"
      @deleted="onDeleted"
    />

    <div v-if="pending" class="p-12 text-center text-sm text-cream-400">{{ $t('common.loading') }}</div>
    <div v-else-if="error" class="p-12 text-center text-sm text-clay-700">{{ error.message }}</div>
    <div v-else-if="!data?.bundles?.length" class="bg-white border border-cream-200 rounded-lg p-12 text-center text-sm text-cream-500 shadow-card">
      {{ $t('bundles.noneYet') }}
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="b in data.bundles"
        :key="b.bundle_sku"
        class="bg-white border border-cream-200 rounded-lg p-5 shadow-card hover:shadow-lg hover:border-clay-300 cursor-pointer transition"
        @click="openEditForm(b)"
      >
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
