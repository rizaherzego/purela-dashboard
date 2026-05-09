<script setup lang="ts">
defineProps<{
  title: string
  description: string
  /** Where the popup floats relative to the icon */
  placement?: 'top' | 'bottom' | 'left'
}>()
</script>

<template>
  <span class="relative inline-flex items-center group align-middle">
    <Icon
      name="lucide:info"
      class="size-3.5 text-cream-400 group-hover:text-clay-500 transition-colors cursor-help"
    />
    <span
      class="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-150 absolute z-30 w-72 bg-cream-50 border border-cream-200 rounded-lg p-3 shadow-pop pointer-events-none text-left"
      :class="{
        'bottom-full left-1/2 -translate-x-1/2 mb-2': !placement || placement === 'top',
        'top-full left-1/2 -translate-x-1/2 mt-2':    placement === 'bottom',
        'right-full top-1/2 -translate-y-1/2 mr-2':   placement === 'left',
      }"
    >
      <span class="block display text-xs font-medium text-cream-800 mb-1">{{ title }}</span>
      <span class="block text-xs text-cream-600 leading-relaxed whitespace-pre-line">{{ description }}</span>
    </span>
  </span>
</template>
