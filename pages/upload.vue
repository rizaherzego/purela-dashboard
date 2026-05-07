<script setup lang="ts">
definePageMeta({ title: 'Upload' })

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
    <p class="text-sm text-gray-500 max-w-xl">
      Upload marketplace exports here. Files are previewed before being written —
      headers are validated against what we expect for the chosen file type.
    </p>

    <ClientOnly>
      <div v-if="importResult" class="bg-emerald-50 border border-emerald-200 rounded-xl p-5 max-w-xl space-y-3">
        <div class="flex items-center gap-2">
          <Icon name="lucide:check-circle" class="size-5 text-emerald-600" />
          <h2 class="text-sm font-semibold text-emerald-900">Import complete</h2>
        </div>
        <dl class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <dt class="text-emerald-800">Batch</dt>            <dd class="font-medium text-emerald-900">#{{ importResult.batch_id }}</dd>
          <dt class="text-emerald-800">Rows imported</dt>    <dd class="font-medium text-emerald-900">{{ importResult.row_count?.toLocaleString() }}</dd>
          <dt class="text-emerald-800">Period</dt>           <dd class="font-medium text-emerald-900">{{ importResult.period_start || '?' }} → {{ importResult.period_end || '?' }}</dd>
          <dt class="text-emerald-800">Fact rows rebuilt</dt><dd class="font-medium text-emerald-900">{{ importResult.fact_rows_rebuilt ?? '—' }}</dd>
        </dl>
        <div class="flex gap-3">
          <button class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium" @click="reset">
            Upload another
          </button>
          <NuxtLink to="/imports" class="px-4 py-2 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium">
            View imports
          </NuxtLink>
        </div>
      </div>

      <UploadPreview v-else-if="stagedPayload" :payload="stagedPayload" @cancel="reset" @imported="onImported" />
      <UploadStager v-else @staged="onStaged" />
    </ClientOnly>
  </div>
</template>
