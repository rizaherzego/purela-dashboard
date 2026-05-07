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
  <div class="space-y-4">
    <p class="text-sm text-gray-500">
      Every CSV/XLSX upload creates a batch. Deleting a batch cascades to its raw rows and
      triggers an ETL rebuild for the affected (channel, date range).
    </p>

    <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div v-if="pending" class="p-8 text-center text-sm text-gray-400">Loading…</div>
      <div v-else-if="error" class="p-8 text-center text-sm text-red-600">{{ error.message }}</div>
      <div v-else-if="!data?.batches?.length" class="p-8 text-center text-sm text-gray-400">
        No imports yet. Head to <NuxtLink to="/upload" class="text-emerald-600 underline">Upload</NuxtLink> to add your first file.
      </div>
      <table v-else class="w-full text-sm">
        <thead class="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="px-4 py-2.5 text-left">Batch</th>
            <th class="px-4 py-2.5 text-left">Channel</th>
            <th class="px-4 py-2.5 text-left">File type</th>
            <th class="px-4 py-2.5 text-left">File</th>
            <th class="px-4 py-2.5 text-left">Period</th>
            <th class="px-4 py-2.5 text-right">Rows</th>
            <th class="px-4 py-2.5 text-left">Imported</th>
            <th class="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="b in data.batches" :key="b.batch_id" class="hover:bg-gray-50">
            <td class="px-4 py-2.5 font-mono text-xs">#{{ b.batch_id }}</td>
            <td class="px-4 py-2.5">{{ b.channel_id }}</td>
            <td class="px-4 py-2.5 text-gray-500">{{ b.file_type_id }}</td>
            <td class="px-4 py-2.5 max-w-xs truncate" :title="b.file_name">{{ b.file_name }}</td>
            <td class="px-4 py-2.5 text-gray-600">{{ b.period_start || '?' }} → {{ b.period_end || '?' }}</td>
            <td class="px-4 py-2.5 text-right font-medium">{{ b.row_count?.toLocaleString() ?? '—' }}</td>
            <td class="px-4 py-2.5 text-gray-500">{{ formatDate(b.imported_at) }}</td>
            <td class="px-4 py-2.5 text-right">
              <button
                class="text-red-600 hover:text-red-700 text-xs font-medium disabled:text-gray-300"
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
