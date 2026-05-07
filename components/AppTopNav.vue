<script setup lang="ts">
const route = useRoute()
const settingsOpen = ref(false)
const channelsOpen = ref(false)

const channelLinks = [
  { label: 'TikTok Shop', to: '/channel/tiktok' },
  { label: 'Shopee', to: '/channel/shopee' },
  { label: 'Tokopedia', to: '/channel/tokopedia' },
]

const settingsLinks = [
  { label: 'Upload', to: '/upload', icon: 'lucide:upload' },
  { label: 'Imports', to: '/imports', icon: 'lucide:history' },
  { label: 'Products', to: '/products', icon: 'lucide:package' },
  { label: 'Bundles', to: '/bundles', icon: 'lucide:boxes' },
  { label: 'SKU Mapping', to: '/sku-mapping', icon: 'lucide:link' },
]

const isChannelActive = computed(() => route.path.startsWith('/channel/'))

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/login')
}

function navClasses(active: boolean) {
  return [
    'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
    active
      ? 'bg-emerald-50 text-emerald-700'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
  ]
}

// Click-outside helpers
function closeMenus() {
  settingsOpen.value = false
  channelsOpen.value = false
}
onMounted(() => {
  document.addEventListener('click', closeMenus)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeMenus)
})
</script>

<template>
  <header class="bg-white border-b border-gray-200 sticky top-0 z-30">
    <div class="px-6 h-14 flex items-center justify-between">
      <div class="flex items-center gap-6">
        <NuxtLink to="/" class="flex items-center" @click.stop>
          <span class="text-base font-bold text-gray-900">Purela</span>
          <span class="ml-1.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Dashboard</span>
        </NuxtLink>

        <nav class="flex items-center gap-1">
          <NuxtLink
            to="/"
            :class="navClasses(route.path === '/')"
            @click.stop
          >
            Overview
          </NuxtLink>

          <div class="relative" @click.stop>
            <button
              :class="navClasses(isChannelActive)"
              type="button"
              @click="channelsOpen = !channelsOpen; settingsOpen = false"
            >
              Channels
              <Icon name="lucide:chevron-down" class="ml-1 size-3.5" />
            </button>
            <div
              v-if="channelsOpen"
              class="absolute left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10"
            >
              <NuxtLink
                v-for="link in channelLinks"
                :key="link.to"
                :to="link.to"
                class="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                @click="channelsOpen = false"
              >
                {{ link.label }}
              </NuxtLink>
            </div>
          </div>

          <NuxtLink
            to="/sku"
            :class="navClasses(route.path === '/sku')"
            @click.stop
          >
            SKUs
          </NuxtLink>
          <NuxtLink
            to="/data-quality"
            :class="navClasses(route.path === '/data-quality')"
            @click.stop
          >
            Data Quality
          </NuxtLink>
        </nav>
      </div>

      <div class="relative" @click.stop>
        <button
          class="inline-flex items-center px-2.5 py-1.5 rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          type="button"
          @click="settingsOpen = !settingsOpen; channelsOpen = false"
        >
          <Icon name="lucide:settings" class="size-5" />
        </button>
        <div
          v-if="settingsOpen"
          class="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10"
        >
          <NuxtLink
            v-for="link in settingsLinks"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            @click="settingsOpen = false"
          >
            <Icon :name="link.icon" class="size-4 text-gray-400" />
            {{ link.label }}
          </NuxtLink>
          <div class="border-t border-gray-100 my-1" />
          <button
            type="button"
            class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left"
            @click="logout"
          >
            <Icon name="lucide:log-out" class="size-4 text-gray-400" />
            Log out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
