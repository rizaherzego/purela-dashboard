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

const { t } = useI18n()
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
    error.value = e?.statusMessage || e?.message || t('errors.uploadFailed')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <form
    class="bg-white border border-cream-200 rounded-lg p-7 space-y-6 max-w-xl shadow-card"
    @submit.prevent="submit"
  >
    <p v-if="channelsError" class="text-sm text-clay-700">
      {{ $t('errors.channelsLoadFailed') }} {{ channelsError.message }}
    </p>

    <div>
      <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-2">{{ $t('upload.stager.channel') }}</label>
      <select
        v-model="channelId"
        class="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500 transition"
        :disabled="channelsLoading"
      >
        <option value="" disabled>{{ $t('upload.stager.selectChannel') }}</option>
        <option v-for="c in data?.channels ?? []" :key="c.channel_id" :value="c.channel_id">
          {{ c.channel_name }}
        </option>
      </select>
    </div>

    <div>
      <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-2">{{ $t('upload.stager.fileType') }}</label>
      <select
        v-model="fileTypeId"
        class="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500 transition disabled:opacity-50"
        :disabled="!channelId"
      >
        <option value="" disabled>{{ channelId ? $t('upload.stager.selectFileType') : $t('upload.stager.pickChannelFirst') }}</option>
        <option v-for="ft in fileTypes" :key="ft.file_type_id" :value="ft.file_type_id">
          {{ ft.display_name }}
        </option>
      </select>
      <p v-if="selectedFileType?.description" class="mt-2 text-xs text-cream-500 leading-relaxed">
        {{ selectedFileType.description }}
      </p>
    </div>

    <div>
      <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-2">{{ $t('upload.stager.file') }}</label>
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        class="block w-full text-sm text-cream-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-clay-50 file:text-clay-700 hover:file:bg-clay-100"
        @change="onFile"
      >
      <p class="mt-2 text-xs text-cream-400">{{ $t('upload.stager.csvOrXlsx') }}</p>
    </div>

    <p v-if="error" class="text-sm text-clay-700">{{ error }}</p>

    <button
      type="submit"
      class="px-5 py-2.5 bg-clay-500 hover:bg-clay-600 disabled:bg-clay-300 text-white rounded-md text-sm font-medium transition-colors"
      :disabled="!channelId || !fileTypeId || !file || submitting"
    >
      {{ submitting ? $t('upload.stager.staging') : $t('upload.stager.stage') }}
    </button>
  </form>
</template>
