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

const { t } = useI18n()
const { formatNumber } = useFormat()

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
    error.value = e?.statusMessage || e?.message || t('errors.importFailed')
  }
  finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="bg-white border border-cream-200 rounded-lg p-7 space-y-6 shadow-card max-w-3xl">
    <div v-if="payload.duplicate" class="space-y-4">
      <div class="flex items-start gap-3 p-4 bg-clay-50 border border-clay-100 rounded-md">
        <Icon name="lucide:alert-circle" class="size-5 text-clay-600 mt-0.5 shrink-0" />
        <div class="text-sm text-clay-800">
          <p class="font-medium text-clay-900">{{ $t('upload.preview.duplicateTitle') }}</p>
          <p class="mt-1.5 text-clay-700">
            {{ $t('upload.preview.duplicateDetail', {
              batch: payload.existing.batch_id,
              rows: formatNumber(payload.existing.row_count),
              start: payload.existing.period_start,
              end: payload.existing.period_end,
            }) }}
          </p>
        </div>
      </div>
      <button class="px-4 py-2 text-sm border border-cream-200 rounded-md hover:bg-cream-100" @click="emit('cancel')">
        {{ $t('common.back') }}
      </button>
    </div>

    <div v-else class="space-y-6">
      <div>
        <h3 class="display text-lg mb-4">{{ $t('upload.preview.title') }}</h3>
        <dl class="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-3 text-sm">
          <dt class="text-cream-500">{{ $t('upload.preview.fileLabel') }}</dt>           <dd class="text-cream-800">{{ payload.file_name }}</dd>
          <dt class="text-cream-500">{{ $t('upload.preview.typeLabel') }}</dt>           <dd class="text-cream-800">{{ payload.file_type?.display_name }}</dd>
          <dt class="text-cream-500">{{ $t('upload.preview.rowsLabel') }}</dt>           <dd class="text-cream-800">{{ payload.row_count != null ? formatNumber(payload.row_count) : '—' }}</dd>
          <dt class="text-cream-500">{{ $t('upload.preview.dateRange') }}</dt>     <dd class="text-cream-800">{{ payload.period_start || '?' }} → {{ payload.period_end || '?' }}</dd>
        </dl>
      </div>

      <div v-if="hasMissing" class="p-4 bg-clay-50 border border-clay-100 rounded-md">
        <p class="text-sm font-medium text-clay-900 mb-2">{{ $t('upload.preview.missingColumnsTitle') }}</p>
        <ul class="text-xs text-clay-800 space-y-1">
          <li v-for="col in payload.missing_columns" :key="col" class="font-mono">{{ col }}</li>
        </ul>
        <p class="mt-3 text-xs text-clay-700">{{ $t('upload.preview.missingColumnsHelp') }}</p>
      </div>

      <div v-if="(payload.extra_columns?.length ?? 0) > 0" class="text-xs text-cream-500">
        <span class="text-cream-700">{{ $t('upload.preview.extraColumns') }}</span>
        <span class="ml-1 font-mono">{{ payload.extra_columns?.slice(0, 6).join(', ') }}{{ (payload.extra_columns?.length ?? 0) > 6 ? '…' : '' }}</span>
      </div>

      <div v-if="payload.sample_rows?.length">
        <h3 class="text-xs uppercase tracking-wider text-cream-500 font-medium mb-3">{{ $t('upload.preview.firstNRows', { n: payload.sample_rows.length }) }}</h3>
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
          :disabled="importing || hasMissing"
          @click="confirmImport"
        >
          {{ importing ? $t('upload.preview.importing') : $t('upload.preview.confirmImport') }}
        </button>
        <button
          class="px-4 py-2 text-sm text-cream-600 hover:text-cream-900 hover:bg-cream-100 rounded-md transition"
          :disabled="importing"
          @click="emit('cancel')"
        >
          {{ $t('common.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>
