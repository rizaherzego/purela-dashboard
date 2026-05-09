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
    'inline-flex items-center px-3 py-1.5 rounded-md text-sm transition-colors',
    active
      ? 'text-cream-900 font-medium'
      : 'text-cream-600 hover:text-cream-900',
  ]
}

function closeMenus() {
  settingsOpen.value = false
  channelsOpen.value = false
}
onMounted(() => document.addEventListener('click', closeMenus))
onBeforeUnmount(() => document.removeEventListener('click', closeMenus))
</script>

<template>
  <header class="bg-cream-50/80 backdrop-blur border-b border-cream-200 sticky top-0 z-30">
    <div class="px-8 h-16 flex items-center justify-between max-w-screen-2xl mx-auto">
      <div class="flex items-center gap-8">
        <NuxtLink to="/" class="flex items-baseline gap-1.5" @click.stop>
          <span class="display text-lg text-cream-900">Purela</span>
          <span class="text-[10px] uppercase tracking-widest text-cream-500">Dashboard</span>
        </NuxtLink>

        <nav class="flex items-center gap-1">
          <NuxtLink to="/" :class="navClasses(route.path === '/')" @click.stop>
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
              class="absolute left-0 mt-1.5 w-44 bg-white border border-cream-200 rounded-md shadow-pop py-1 z-10"
            >
              <NuxtLink
                v-for="link in channelLinks"
                :key="link.to"
                :to="link.to"
                class="block px-3 py-2 text-sm text-cream-700 hover:bg-cream-100 hover:text-cream-900"
                @click="channelsOpen = false"
              >
                {{ link.label }}
              </NuxtLink>
            </div>
          </div>

          <NuxtLink to="/sku" :class="navClasses(route.path === '/sku')" @click.stop>
            SKUs
          </NuxtLink>
          <NuxtLink to="/flow" :class="navClasses(route.path === '/flow')" @click.stop>
            Flow
          </NuxtLink>
          <NuxtLink to="/data-quality" :class="navClasses(route.path === '/data-quality')" @click.stop>
            Data Quality
          </NuxtLink>
        </nav>
      </div>

      <div class="relative" @click.stop>
        <button
          class="inline-flex items-center justify-center size-8 rounded-md text-cream-500 hover:text-cream-900 hover:bg-cream-100"
          type="button"
          @click="settingsOpen = !settingsOpen; channelsOpen = false"
        >
          <Icon name="lucide:settings" class="size-4" />
        </button>
        <div
          v-if="settingsOpen"
          class="absolute right-0 mt-1.5 w-52 bg-white border border-cream-200 rounded-md shadow-pop py-1 z-10"
        >
          <NuxtLink
            v-for="link in settingsLinks"
            :key="link.to"
            :to="link.to"
            class="flex items-center gap-3 px-3 py-2 text-sm text-cream-700 hover:bg-cream-100 hover:text-cream-900"
            @click="settingsOpen = false"
          >
            <Icon :name="link.icon" class="size-4 text-cream-400" />
            {{ link.label }}
          </NuxtLink>
          <div class="border-t border-cream-200 my-1" />
          <button
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2 text-sm text-cream-700 hover:bg-cream-100 hover:text-cream-900 text-left"
            @click="logout"
          >
            <Icon name="lucide:log-out" class="size-4 text-cream-400" />
            Log out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
