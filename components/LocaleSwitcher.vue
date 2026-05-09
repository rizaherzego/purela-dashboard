<script setup lang="ts">
const { locale, setLocale } = useI18n()
const items = [
  { code: 'en', label: 'EN' },
  { code: 'id', label: 'ID' },
] as const
</script>

<template>
  <div class="inline-flex items-center rounded-md border border-cream-200 bg-cream-50/60 p-0.5 text-xs">
    <button
      v-for="i in items"
      :key="i.code"
      type="button"
      :class="[
        'px-2 py-1 rounded transition-colors',
        locale === i.code
          ? 'bg-white text-cream-900 shadow-sm font-medium'
          : 'text-cream-500 hover:text-cream-900',
      ]"
      @click="setLocale(i.code as any)"
    >
      {{ i.label }}
    </button>
  </div>
</template>
