<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  message: string
  severity: 'info' | 'warn' | 'critical'
  value?: string | number
  actionUrl?: string
}>()
</script>

<template>
  <NuxtLink
    :to="actionUrl || '#'"
    class="block bg-white border rounded-lg p-4 shadow-card transition-all"
    :class="{
      'border-cream-200 hover:shadow-lg hover:border-cream-300': severity === 'info',
      'border-clay-200 hover:shadow-lg hover:border-clay-400 hover:bg-clay-50/20': severity === 'warn',
      'border-clay-500 bg-clay-50/20 hover:shadow-lg hover:bg-clay-50/40': severity === 'critical',
    }"
  >
    <div class="flex items-start gap-3">
      <div
        class="p-2 rounded-lg flex-shrink-0"
        :class="{
          'bg-cream-100': severity === 'info',
          'bg-clay-100': severity === 'warn' || severity === 'critical',
        }"
      >
        <Icon
          :name="icon"
          class="size-5"
          :class="{
            'text-cream-600': severity === 'info',
            'text-clay-600': severity === 'warn' || severity === 'critical',
          }"
        />
      </div>

      <div class="flex-1 min-w-0">
        <h3 class="display text-sm font-medium leading-snug">{{ title }}</h3>
        <p class="mt-1 text-xs text-cream-600 leading-relaxed">{{ message }}</p>
        <p v-if="value" class="mt-1.5 text-xs font-medium text-cream-700">{{ value }}</p>
      </div>

      <Icon v-if="actionUrl" name="lucide:arrow-right" class="size-4 text-cream-400 flex-shrink-0 mt-1" />
    </div>
  </NuxtLink>
</template>
