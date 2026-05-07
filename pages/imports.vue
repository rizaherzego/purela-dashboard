<script setup lang="ts">
definePageMeta({ title: 'Import history' })

const { formatDate } = useFormat()

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
  const ok = window.confirm(`Delete batch #${id}? Raw rows will be removed and fact_orders will be recomputed for the affected period.`)
  if (!ok) return
  deleting.value = id
  try {
    await $fetch(`/api/imports/${id}`, { method: 'DELETE' })
    await refresh()
  }
  catch (e: any) {
    window.alert(e?.statusMessage || e?.message || 'Delete failed.')
  }
  finally {
    deleting.value = null
  }
}
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-cream-600 max-w-2xl leading-relaxed">
      Every CSV/XLSX upload creates a batch. Deleting a batch cascades to its raw rows and
      triggers an ETL rebuild for the affected (channel, date range).
    </p>

    <div class="bg-white border border-cream-200 rounded-lg overflow-hidden shadow-card">
      <div v-if="pending" class="p-12 text-center text-sm text-cream-400">Loading…</div>
      <div v-else-if="error" class="p-12 text-center text-sm text-clay-700">{{ error.message }}</div>
      <div v-else-if="!data?.batches?.length" class="p-12 text-center text-sm text-cream-500">
        No imports yet. Head to <NuxtLink to="/upload" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">Upload</NuxtLink> to add your first file.
      </div>
      <table v-else class="w-full text-sm">
        <thead class="text-xs uppercase tracking-wider text-cream-500 bg-cream-100/60 border-b border-cream-200">
          <tr>
            <th class="px-5 py-3 text-left font-medium">Batch</th>
            <th class="px-5 py-3 text-left font-medium">Channel</th>
            <th class="px-5 py-3 text-left font-medium">File type</th>
            <th class="px-5 py-3 text-left font-medium">File</th>
            <th class="px-5 py-3 text-left font-medium">Period</th>
            <th class="px-5 py-3 text-right font-medium">Rows</th>
            <th class="px-5 py-3 text-left font-medium">Imported</th>
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
            <td class="px-5 py-3 text-right text-cream-800">{{ b.row_count?.toLocaleString() ?? '—' }}</td>
            <td class="px-5 py-3 text-cream-500">{{ formatDate(b.imported_at) }}</td>
            <td class="px-5 py-3 text-right">
              <button
                class="text-clay-600 hover:text-clay-700 text-xs disabled:text-cream-300"
                :disabled="deleting === b.batch_id"
                @click="remove(b.batch_id)"
              >
                {{ deleting === b.batch_id ? 'Deleting…' : 'Delete' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
