<script setup lang="ts">
interface FileType {
  file_type_id: string
  display_name: string
  description?: string | null
}
interface Channel {
  channel_id: string
  channel_name: string
  file_types: FileType[]
}

const emit = defineEmits<{
  staged: [payload: any]
}>()

const { data, pending: channelsLoading, error: channelsError } = await useFetch<{ channels: Channel[] }>('/api/channels')

const channelId = ref<string>('')
const fileTypeId = ref<string>('')
const file = ref<File | null>(null)
const submitting = ref(false)
const error = ref<string | null>(null)

const selectedChannel = computed(() => data.value?.channels.find(c => c.channel_id === channelId.value))
const fileTypes = computed(() => selectedChannel.value?.file_types ?? [])
const selectedFileType = computed(() => fileTypes.value.find(ft => ft.file_type_id === fileTypeId.value))

watch(channelId, () => {
  fileTypeId.value = ''
})

function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
}

async function submit() {
  if (!channelId.value || !fileTypeId.value || !file.value) return
  submitting.value = true
  error.value = null

  const fd = new FormData()
  fd.append('channel_id', channelId.value)
  fd.append('file_type_id', fileTypeId.value)
  fd.append('file', file.value)

  try {
    const result = await $fetch('/api/upload/stage', { method: 'POST', body: fd })
    emit('staged', result)
  }
  catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Upload failed.'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <form
    class="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-xl"
    @submit.prevent="submit"
  >
    <p v-if="channelsError" class="text-sm text-red-600">
      Failed to load channels. {{ channelsError.message }}
    </p>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">Channel</label>
      <select
        v-model="channelId"
        class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        :disabled="channelsLoading"
      >
        <option value="" disabled>Select a channel…</option>
        <option v-for="c in data?.channels ?? []" :key="c.channel_id" :value="c.channel_id">
          {{ c.channel_name }}
        </option>
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">File type</label>
      <select
        v-model="fileTypeId"
        class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50"
        :disabled="!channelId"
      >
        <option value="" disabled>{{ channelId ? 'Select a file type…' : 'Pick a channel first' }}</option>
        <option v-for="ft in fileTypes" :key="ft.file_type_id" :value="ft.file_type_id">
          {{ ft.display_name }}
        </option>
      </select>
      <p v-if="selectedFileType?.description" class="mt-1.5 text-xs text-gray-500">
        {{ selectedFileType.description }}
      </p>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1.5">File</label>
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        class="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
        @change="onFile"
      >
      <p class="mt-1.5 text-xs text-gray-400">CSV or XLSX, max 50 MB.</p>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

    <button
      type="submit"
      class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg text-sm font-medium"
      :disabled="!channelId || !fileTypeId || !file || submitting"
    >
      {{ submitting ? 'Staging…' : 'Stage upload' }}
    </button>
  </form>
</template>
