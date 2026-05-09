<script setup lang="ts">
interface ChannelResult {
  channel_id: string
  date_from: string
  date_to: string
  rows_rebuilt: number | null
  error: string | null
}
interface RebuildResponse {
  channels: ChannelResult[]
  total_rows_rebuilt: number
}

const props = defineProps<{
  variant?: 'primary' | 'secondary'
  label?: string
  channelId?: string
}>()
const emit = defineEmits<{
  done: [result: RebuildResponse]
}>()

const { t } = useI18n()
const { formatNumber } = useFormat()

const running = ref(false)
const error = ref<string | null>(null)
const result = ref<RebuildResponse | null>(null)

const baseClass = computed(() => {
  if (props.variant === 'primary') {
    return 'px-3.5 py-2 text-sm bg-clay-500 hover:bg-clay-600 disabled:bg-clay-300 text-white rounded-md font-medium transition'
  }
  return 'px-3.5 py-2 text-sm border border-cream-200 hover:bg-cream-100 text-cream-700 rounded-md font-medium transition'
})

async function run() {
  running.value = true
  error.value = null
  result.value = null
  try {
    const body = props.channelId ? { channel_id: props.channelId } : {}
    const r = await $fetch<RebuildResponse>('/api/admin/etl/rebuild', { method: 'POST', body })
    result.value = r
    emit('done', r)
  }
  catch (e: any) {
    error.value = e?.statusMessage || e?.message || t('errors.etlFailed')
  }
  finally {
    running.value = false
  }
}
</script>

<template>
  <div class="inline-flex items-center gap-3">
    <button
      type="button"
      :class="baseClass"
      :disabled="running"
      @click="run"
    >
      <Icon
        v-if="running"
        name="lucide:loader-2"
        class="size-3.5 animate-spin inline-block mr-1.5 -mt-0.5"
      />
      {{ running ? $t('etl.rebuilding') : (label ?? $t('etl.rerun')) }}
    </button>

    <p v-if="error" class="text-xs text-clay-700">{{ error }}</p>
    <p v-else-if="result" class="text-xs text-cream-600">
      <template v-if="result.channels.length === 0">
        {{ $t('etl.noImportsYet') }}
      </template>
      <template v-else>
        {{ $t('etl.rebuiltSummary', { rows: formatNumber(result.total_rows_rebuilt), channels: result.channels.length }) }}
        <span
          v-for="c in result.channels.filter(c => c.error)"
          :key="c.channel_id"
          class="block text-clay-700"
        >
          {{ c.channel_id }}: {{ c.error }}
        </span>
      </template>
    </p>
  </div>
</template>
