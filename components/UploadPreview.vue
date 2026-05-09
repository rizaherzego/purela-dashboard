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
  blocking_missing?: string[]
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

// `missing_columns`: expected but absent — informational. TikTok ships different
// column sets depending on which account features are enabled, so absence is
// usually fine and the ETL will just leave those fields null.
// `blocking_missing`: columns the ETL truly cannot run without — disables import.
const hasOptionalMissing = computed(() => (props.payload.missing_columns?.length ?? 0) > 0)
const hasBlocking = computed(() => (props.payload.blocking_missing?.length ?? 0) > 0)

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
  <div class="bg-white border border-cream-200 rounded-lg p-7 space-y-6 shadow-card max-w-3xl">
    <!-- Duplicate -->
    <div v-if="payload.duplicate" class="space-y-4">
      <div class="flex items-start gap-3 p-4 bg-clay-50 border border-clay-100 rounded-md">
        <Icon name="lucide:alert-circle" class="size-5 text-clay-600 mt-0.5 shrink-0" />
        <div class="text-sm text-clay-800">
          <p class="font-medium text-clay-900">This file has already been imported.</p>
          <p class="mt-1.5 text-clay-700">
            Existing batch #{{ payload.existing.batch_id }} —
            {{ payload.existing.row_count }} rows,
            covering {{ payload.existing.period_start }} – {{ payload.existing.period_end }}.
          </p>
        </div>
      </div>
      <button class="px-4 py-2 text-sm border border-cream-200 rounded-md hover:bg-cream-100" @click="emit('cancel')">
        Back
      </button>
    </div>

    <!-- Preview -->
    <div v-else class="space-y-6">
      <div>
        <h3 class="display text-lg mb-4">Preview</h3>
        <dl class="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-3 text-sm">
          <dt class="text-cream-500">File</dt>           <dd class="text-cream-800">{{ payload.file_name }}</dd>
          <dt class="text-cream-500">Type</dt>           <dd class="text-cream-800">{{ payload.file_type?.display_name }}</dd>
          <dt class="text-cream-500">Rows</dt>           <dd class="text-cream-800">{{ payload.row_count?.toLocaleString() }}</dd>
          <dt class="text-cream-500">Date range</dt>     <dd class="text-cream-800">{{ payload.period_start || '?' }} → {{ payload.period_end || '?' }}</dd>
        </dl>
      </div>

      <!-- Truly required columns missing — blocks import -->
      <div v-if="hasBlocking" class="p-4 bg-clay-50 border border-clay-200 rounded-md">
        <p class="text-sm font-medium text-clay-900 mb-2">Required columns missing</p>
        <ul class="text-xs text-clay-800 space-y-1">
          <li v-for="col in payload.blocking_missing" :key="col" class="font-mono">{{ col }}</li>
        </ul>
        <p class="mt-3 text-xs text-clay-700">The ETL can't run without these. Likely the wrong file type was selected — cancel and try again.</p>
      </div>

      <!-- Expected-but-absent columns — informational only -->
      <div v-else-if="hasOptionalMissing" class="p-4 bg-cream-100 border border-cream-200 rounded-md">
        <p class="text-sm font-medium text-cream-800 mb-2">Some expected columns aren't in this file</p>
        <ul class="text-xs text-cream-700 space-y-1 max-h-32 overflow-y-auto">
          <li v-for="col in payload.missing_columns" :key="col" class="font-mono">{{ col }}</li>
        </ul>
        <p class="mt-3 text-xs text-cream-600">
          This is usually fine — TikTok omits feature-specific columns (affiliate, ads, GMV Max, etc.) when
          those features aren't active on the account. Those fields will be left blank.
        </p>
      </div>

      <div v-if="(payload.extra_columns?.length ?? 0) > 0" class="text-xs text-cream-500">
        <span class="text-cream-700">Extra columns detected (preserved as raw_data):</span>
        <span class="ml-1 font-mono">{{ payload.extra_columns?.slice(0, 6).join(', ') }}{{ (payload.extra_columns?.length ?? 0) > 6 ? '…' : '' }}</span>
      </div>

      <div v-if="payload.sample_rows?.length">
        <h3 class="text-xs uppercase tracking-wider text-cream-500 font-medium mb-3">First {{ payload.sample_rows.length }} rows</h3>
        <div class="overflow-x-auto border border-cream-200 rounded-md">
          <table class="w-full text-xs">
            <thead class="bg-cream-100 text-cream-600">
              <tr>
                <th v-for="c in sampleColumns" :key="c" class="px-3 py-2 text-left font-medium whitespace-nowrap">{{ c }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-200">
              <tr v-for="(r, i) in payload.sample_rows" :key="i">
                <td v-for="c in sampleColumns" :key="c" class="px-3 py-2 whitespace-nowrap text-cream-700">
                  {{ r[c] ?? '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p v-if="error" class="text-sm text-clay-700">{{ error }}</p>

      <div class="flex items-center gap-3 pt-4 border-t border-cream-200">
        <button
          class="px-5 py-2.5 bg-clay-500 hover:bg-clay-600 disabled:bg-clay-300 text-white rounded-md text-sm font-medium transition-colors"
          :disabled="importing || hasBlocking"
          @click="confirmImport"
        >
          {{ importing ? 'Importing…' : 'Confirm import' }}
        </button>
        <button
          class="px-4 py-2 text-sm text-cream-600 hover:text-cream-900 hover:bg-cream-100 rounded-md transition"
          :disabled="importing"
          @click="emit('cancel')"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>
