<script setup lang="ts">
defineProps<{
  label: string
  value: string
  hint?: string
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  icon?: string
  tooltip?: string
}>()
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-200 p-5">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-1.5">
        <span class="text-sm font-medium text-gray-500">{{ label }}</span>
        <span v-if="tooltip" class="text-gray-300" :title="tooltip">
          <Icon name="lucide:info" class="size-3.5" />
        </span>
      </div>
      <div v-if="icon" class="size-9 rounded-lg bg-emerald-50 flex items-center justify-center">
        <Icon :name="icon" class="size-5 text-emerald-600" />
      </div>
    </div>
    <div class="text-2xl font-bold text-gray-900">{{ value }}</div>
    <div v-if="hint" class="mt-1 text-xs text-gray-400">{{ hint }}</div>
    <div
      v-if="change"
      class="mt-1 inline-flex items-center gap-1 text-xs font-medium"
      :class="{
        'text-emerald-600': changeType === 'up',
        'text-red-500': changeType === 'down',
        'text-gray-400': changeType === 'neutral' || !changeType,
      }"
    >
      <Icon
        v-if="changeType === 'up'"
        name="lucide:trending-up"
        class="size-3.5"
      />
      <Icon
        v-else-if="changeType === 'down'"
        name="lucide:trending-down"
        class="size-3.5"
      />
      {{ change }}
    </div>
  </div>
</template>
