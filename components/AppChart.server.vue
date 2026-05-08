<script setup lang="ts">
const props = defineProps<{ height?: string }>()
</script>

<template>
  <div
    class="bg-cream-50 rounded-md animate-pulse"
    :style="{ height: props.height ?? '240px' }"
  />
</template>
