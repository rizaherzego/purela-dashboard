<script setup lang="ts">
const props = defineProps<{
  from: string
  to: string
}>()
const emit = defineEmits<{
  'update:from': [value: string]
  'update:to':   [value: string]
}>()

const today = () => new Date()
const fmt = (d: Date) => d.toISOString().slice(0, 10)
const dayOffset = (offset: number) => {
  const d = today()
  d.setUTCDate(d.getUTCDate() - offset)
  return fmt(d)
}
const startOfMonth = (offset = 0) => {
  const d = today()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() - offset)
  return fmt(d)
}
const endOfMonth = (offset = 0) => {
  const d = today()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() - offset + 1)
  d.setUTCDate(0)
  return fmt(d)
}

interface Preset {
  key: string
  label: string
  from: () => string
  to: () => string
}
const PRESETS: Preset[] = [
  { key: '7d',         label: 'Last 7d',     from: () => dayOffset(7),  to: () => dayOffset(0) },
  { key: '30d',        label: 'Last 30d',    from: () => dayOffset(30), to: () => dayOffset(0) },
  { key: '90d',        label: 'Last 90d',    from: () => dayOffset(90), to: () => dayOffset(0) },
  { key: 'this_month', label: 'This month',  from: () => startOfMonth(0), to: () => dayOffset(0) },
  { key: 'last_month', label: 'Last month',  from: () => startOfMonth(1), to: () => endOfMonth(1) },
  { key: 'all',        label: 'All time',    from: () => '2020-01-01',   to: () => dayOffset(0) },
]

const activePreset = computed(() => {
  return PRESETS.find(p => p.from() === props.from && p.to() === props.to)?.key ?? null
})

function applyPreset(p: Preset) {
  emit('update:from', p.from())
  emit('update:to',   p.to())
}

function onFromInput(e: Event) {
  emit('update:from', (e.target as HTMLInputElement).value)
}
function onToInput(e: Event) {
  emit('update:to', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="bg-white border border-cream-200 rounded-lg px-4 py-3 shadow-card flex flex-wrap items-center gap-x-4 gap-y-2">
    <div class="flex items-center gap-1.5 text-cream-500">
      <Icon name="lucide:calendar" class="size-4" />
      <span class="text-xs uppercase tracking-wider font-medium">Date range</span>
    </div>

    <div class="flex items-center gap-2">
      <input
        type="date"
        :value="from"
        :max="to"
        class="border border-cream-200 rounded-md px-2.5 py-1 text-sm text-cream-700 bg-white focus:outline-none focus:border-clay-500"
        @input="onFromInput"
      />
      <span class="text-xs text-cream-400">to</span>
      <input
        type="date"
        :value="to"
        :min="from"
        class="border border-cream-200 rounded-md px-2.5 py-1 text-sm text-cream-700 bg-white focus:outline-none focus:border-clay-500"
        @input="onToInput"
      />
    </div>

    <div class="flex items-center gap-1 ml-auto">
      <button
        v-for="p in PRESETS"
        :key="p.key"
        type="button"
        class="text-xs px-2.5 py-1 rounded-md border transition-colors"
        :class="activePreset === p.key
          ? 'bg-clay-500 text-white border-clay-500'
          : 'bg-white text-cream-600 border-cream-200 hover:bg-cream-50 hover:text-cream-800'"
        @click="applyPreset(p)"
      >
        {{ p.label }}
      </button>
    </div>
  </div>
</template>
