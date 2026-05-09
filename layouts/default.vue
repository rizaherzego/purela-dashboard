<script setup lang="ts">
const route = useRoute()
const { t, locale } = useI18n()

const pageTitle = computed(() => {
  const meta: any = route.meta || {}
  if (meta.titleKey) return t(meta.titleKey)
  return (meta.title as string) ?? t('nav.dashboard')
})

const todayLong = computed(() => {
  const tag = locale.value === 'id' ? 'id-ID' : 'en-US'
  return new Date().toLocaleDateString(tag, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})
</script>

<template>
  <div class="min-h-screen bg-cream-50 text-cream-700">
    <AppTopNav />
    <div class="px-8 py-8 max-w-screen-2xl mx-auto">
      <header class="flex items-baseline justify-between mb-8 pb-4 border-b border-cream-200">
        <h1 class="display text-2xl">{{ pageTitle }}</h1>
        <div class="text-xs text-cream-500">{{ todayLong }}</div>
      </header>
      <slot />
    </div>
  </div>
</template>
