<script setup lang="ts">
definePageMeta({ titleKey: 'upload.title' })

const { formatNumber } = useFormat()
const stagedPayload = ref<any | null>(null)
const importResult = ref<any | null>(null)

function onStaged(payload: any) {
  stagedPayload.value = payload
  importResult.value = null
}
function reset() {
  stagedPayload.value = null
  importResult.value = null
}
function onImported(result: any) {
  importResult.value = result
  stagedPayload.value = null
}
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-cream-600 max-w-xl leading-relaxed">
      {{ $t('upload.intro') }}
    </p>

    <ClientOnly>
      <div v-if="importResult" class="bg-white border border-cream-200 rounded-lg p-7 max-w-xl space-y-5 shadow-card">
        <div class="flex items-center gap-3">
          <div class="size-9 rounded-full bg-clay-50 flex items-center justify-center">
            <Icon name="lucide:check" class="size-5 text-clay-600" />
          </div>
          <h2 class="display text-lg">{{ $t('upload.complete') }}</h2>
        </div>
        <dl class="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-3 text-sm">
          <dt class="text-cream-500">{{ $t('upload.fields.batch') }}</dt>            <dd class="text-cream-800">#{{ importResult.batch_id }}</dd>
          <dt class="text-cream-500">{{ $t('upload.fields.rowsImported') }}</dt>    <dd class="text-cream-800">{{ importResult.row_count != null ? formatNumber(importResult.row_count) : '—' }}</dd>
          <dt class="text-cream-500">{{ $t('upload.fields.period') }}</dt>           <dd class="text-cream-800">{{ importResult.period_start || '?' }} → {{ importResult.period_end || '?' }}</dd>
          <dt class="text-cream-500">{{ $t('upload.fields.factRowsRebuilt') }}</dt><dd class="text-cream-800">{{ importResult.fact_rows_rebuilt ?? '—' }}</dd>
        </dl>
        <div class="flex gap-3 pt-2">
          <button class="px-4 py-2 bg-clay-500 hover:bg-clay-600 text-white rounded-md text-sm font-medium" @click="reset">
            {{ $t('upload.uploadAnother') }}
          </button>
          <NuxtLink to="/imports" class="px-4 py-2 border border-cream-200 text-cream-700 hover:bg-cream-100 rounded-md text-sm font-medium">
            {{ $t('upload.viewImports') }}
          </NuxtLink>
        </div>
      </div>

      <UploadPreview v-else-if="stagedPayload" :payload="stagedPayload" @cancel="reset" @imported="onImported" />
      <UploadStager v-else @staged="onStaged" />
    </ClientOnly>
  </div>
</template>
