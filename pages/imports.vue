<script setup lang="ts">
definePageMeta({ titleKey: 'imports.title' })

const { t } = useI18n()
const { formatDate, formatNumber } = useFormat()

interface Batch {
  batch_id: number
  channel_id: string
  file_type_id: string
  file_name: string
  period_start: string | null
  period_end: string | null
  row_count: number | null
  imported_at: string
  imported_by: string | null
}

const { data, pending, refresh, error } = await useFetch<{ batches: Batch[] }>('/api/imports')

const deleting = ref<number | null>(null)

async function remove(id: number) {
  const ok = window.confirm(t('imports.deleteConfirm', { id }))
  if (!ok) return
  deleting.value = id
  try {
    await $fetch(`/api/imports/${id}`, { method: 'DELETE' })
    await refresh()
  }
  catch (e: any) {
    window.alert(e?.statusMessage || e?.message || t('errors.deleteFailed'))
  }
  finally {
    deleting.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-6">
      <p class="text-sm text-cream-600 max-w-2xl leading-relaxed">
        {{ $t('imports.intro') }}
      </p>
      <div class="self-start sm:self-auto shrink-0">
        <EtlRebuildButton :label="$t('imports.rerunAll')" />
      </div>
    </div>

    <div class="bg-white border border-cream-200 rounded-lg overflow-hidden shadow-card">
      <div v-if="pending" class="p-12 text-center text-sm text-cream-400">{{ $t('common.loading') }}</div>
      <div v-else-if="error" class="p-12 text-center text-sm text-clay-700">{{ error.message }}</div>
      <div v-else-if="!data?.batches?.length" class="p-12 text-center text-sm text-cream-500">
        {{ $t('imports.noImports') }} <NuxtLink to="/upload" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('imports.noImportsLink') }}</NuxtLink> {{ $t('imports.noImportsTrailing') }}
      </div>
      <div v-else class="overflow-x-auto">
      <table class="w-full text-sm min-w-[820px]">
        <thead class="text-xs uppercase tracking-wider text-cream-500 bg-cream-100/60 border-b border-cream-200">
          <tr>
            <th class="px-5 py-3 text-left font-medium">{{ $t('imports.columns.batch') }}</th>
            <th class="px-5 py-3 text-left font-medium">{{ $t('imports.columns.channel') }}</th>
            <th class="px-5 py-3 text-left font-medium">{{ $t('imports.columns.fileType') }}</th>
            <th class="px-5 py-3 text-left font-medium">{{ $t('imports.columns.file') }}</th>
            <th class="px-5 py-3 text-left font-medium">{{ $t('imports.columns.period') }}</th>
            <th class="px-5 py-3 text-right font-medium">{{ $t('imports.columns.rows') }}</th>
            <th class="px-5 py-3 text-left font-medium">{{ $t('imports.columns.imported') }}</th>
            <th class="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-200">
          <tr v-for="b in data.batches" :key="b.batch_id" class="hover:bg-cream-50">
            <td class="px-5 py-3 font-mono text-xs text-cream-600">#{{ b.batch_id }}</td>
            <td class="px-5 py-3 text-cream-700">{{ b.channel_id }}</td>
            <td class="px-5 py-3 text-cream-500">{{ b.file_type_id }}</td>
            <td class="px-5 py-3 max-w-xs truncate text-cream-700" :title="b.file_name">{{ b.file_name }}</td>
            <td class="px-5 py-3 text-cream-600">{{ b.period_start || '?' }} → {{ b.period_end || '?' }}</td>
            <td class="px-5 py-3 text-right text-cream-800">{{ b.row_count != null ? formatNumber(b.row_count) : '—' }}</td>
            <td class="px-5 py-3 text-cream-500">{{ formatDate(b.imported_at) }}</td>
            <td class="px-5 py-3 text-right">
              <button
                class="text-clay-600 hover:text-clay-700 text-xs disabled:text-cream-300"
                :disabled="deleting === b.batch_id"
                @click="remove(b.batch_id)"
              >
                {{ deleting === b.batch_id ? $t('common.deleting') : $t('common.delete') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  </div>
</template>
