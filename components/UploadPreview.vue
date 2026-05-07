<script setup lang="ts">
interface StagePayload {
  duplicate?: boolean
  existing?: any
  hash: string
  file_name?: string
  file_type?: { id: string, display_name: string, raw_table_name: string }
  row_count?: number
  period_start?: string | null
  period_end?: string | null
  missing_columns?: string[]
  extra_columns?: string[]
  sample_rows?: Record<string, any>[]
}

const props = defineProps<{
  payload: StagePayload
}>()
const emit = defineEmits<{
  cancel: []
  imported: [result: any]
}>()

const importing = ref(false)
const error = ref<string | null>(null)

const sampleColumns = computed(() => {
  const first = props.payload.sample_rows?.[0]
  return first ? Object.keys(first).slice(0, 8) : []
})

const hasMissing = computed(() => (props.payload.missing_columns?.length ?? 0) > 0)

async function confirmImport() {
  importing.value = true
  error.value = null
  try {
    const result = await $fetch('/api/upload/import', {
      method: 'POST',
      body: { hash: props.payload.hash },
    })
    emit('imported', result)
  }
  catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Import failed.'
  }
  finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
    <!-- Duplicate -->
    <div v-if="payload.duplicate" class="space-y-3">
      <div class="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <Icon name="lucide:alert-triangle" class="size-5 text-amber-600 mt-0.5 shrink-0" />
        <div class="text-sm text-amber-900">
          <p class="font-medium">This file has already been imported.</p>
          <p class="mt-1 text-amber-800">
            Existing batch #{{ payload.existing.batch_id }} —
            {{ payload.existing.row_count }} rows,
            covering {{ payload.existing.period_start }} – {{ payload.existing.period_end }}.
          </p>
        </div>
      </div>
      <button class="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50" @click="emit('cancel')">
        Back
      </button>
    </div>

    <!-- Preview -->
    <div v-else class="space-y-5">
      <div>
        <h3 class="text-sm font-semibold text-gray-700 mb-2">Preview</h3>
        <dl class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <dt class="text-gray-500">File</dt>           <dd class="font-medium text-gray-900">{{ payload.file_name }}</dd>
          <dt class="text-gray-500">Type</dt>           <dd class="font-medium text-gray-900">{{ payload.file_type?.display_name }}</dd>
          <dt class="text-gray-500">Rows</dt>           <dd class="font-medium text-gray-900">{{ payload.row_count?.toLocaleString() }}</dd>
          <dt class="text-gray-500">Date range</dt>     <dd class="font-medium text-gray-900">{{ payload.period_start || '?' }} → {{ payload.period_end || '?' }}</dd>
        </dl>
      </div>

      <div v-if="hasMissing" class="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-sm font-medium text-red-900 mb-1">Missing required columns:</p>
        <ul class="text-xs text-red-800 space-y-0.5">
          <li v-for="col in payload.missing_columns" :key="col" class="font-mono">{{ col }}</li>
        </ul>
        <p class="mt-2 text-xs text-red-700">This usually means you uploaded the wrong file type. Cancel and try again.</p>
      </div>

      <div v-if="(payload.extra_columns?.length ?? 0) > 0" class="text-xs text-gray-500">
        <span class="font-medium text-gray-600">Extra columns detected (will be preserved as raw_data):</span>
        <span class="ml-1 font-mono">{{ payload.extra_columns?.slice(0, 6).join(', ') }}{{ (payload.extra_columns?.length ?? 0) > 6 ? '…' : '' }}</span>
      </div>

      <div v-if="payload.sample_rows?.length">
        <h3 class="text-sm font-semibold text-gray-700 mb-2">First {{ payload.sample_rows.length }} rows</h3>
        <div class="overflow-x-auto border border-gray-100 rounded-lg">
          <table class="w-full text-xs">
            <thead class="bg-gray-50 text-gray-500">
              <tr>
                <th v-for="c in sampleColumns" :key="c" class="px-2 py-1.5 text-left font-medium whitespace-nowrap">{{ c }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(r, i) in payload.sample_rows" :key="i">
                <td v-for="c in sampleColumns" :key="c" class="px-2 py-1.5 whitespace-nowrap text-gray-700">
                  {{ r[c] ?? '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex items-center gap-3 pt-2 border-t border-gray-100">
        <button
          class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg text-sm font-medium"
          :disabled="importing || hasMissing"
          @click="confirmImport"
        >
          {{ importing ? 'Importing…' : 'Confirm import' }}
        </button>
        <button
          class="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
          :disabled="importing"
          @click="emit('cancel')"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>
