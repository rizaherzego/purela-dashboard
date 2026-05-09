<script setup lang="ts">
defineProps<{
  label: string
  value: string
  hint?: string
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  icon?: string
  /** Plain-text tooltip — kept for backwards compat, treated as the description body */
  tooltip?: string
  /** Structured tooltip: heading + body, rendered via <InfoTooltip>. */
  tooltipTitle?: string
  tooltipDescription?: string
}>()
</script>

<template>
  <div class="bg-white border border-cream-200 rounded-lg p-5 shadow-card">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-1.5">
        <span class="text-xs uppercase tracking-wider text-cream-500 font-medium">{{ label }}</span>
        <InfoTooltip
          v-if="tooltipDescription || tooltip"
          :title="tooltipTitle ?? label"
          :description="tooltipDescription ?? tooltip ?? ''"
        />
      </div>
      <Icon v-if="icon" :name="icon" class="size-4 text-cream-400" />
    </div>
    <div class="display text-2xl">{{ value }}</div>
    <div v-if="hint" class="mt-1.5 text-xs text-cream-500">{{ hint }}</div>
    <div
      v-if="change"
      class="mt-2 inline-flex items-center gap-1 text-xs"
      :class="{
        'text-clay-600': changeType === 'up',
        'text-cream-600': changeType === 'down',
        'text-cream-400': changeType === 'neutral' || !changeType,
      }"
    >
      <Icon
        v-if="changeType === 'up'"
        name="lucide:arrow-up-right"
        class="size-3"
      />
      <Icon
        v-else-if="changeType === 'down'"
        name="lucide:arrow-down-right"
        class="size-3"
      />
      {{ change }}
    </div>
  </div>
</template>
