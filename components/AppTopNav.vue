<script setup lang="ts">
const route = useRoute()
const settingsOpen = ref(false)
const channelsOpen = ref(false)
const mobileOpen = ref(false)

const channelLinks = [
  { key: 'nav.channelLabels.tiktok', to: '/channel/tiktok' },
  { key: 'nav.channelLabels.shopee', to: '/channel/shopee' },
  { key: 'nav.channelLabels.tokopedia', to: '/channel/tokopedia' },
]

const settingsLinks = [
  { key: 'nav.upload', to: '/upload', icon: 'lucide:upload' },
  { key: 'nav.imports', to: '/imports', icon: 'lucide:history' },
  { key: 'nav.products', to: '/products', icon: 'lucide:package' },
  { key: 'nav.bundles', to: '/bundles', icon: 'lucide:boxes' },
  { key: 'nav.skuMapping', to: '/sku-mapping', icon: 'lucide:link' },
]

// Top-level nav links (overview + sku + flow + data-quality) shown both
// in the desktop bar and the mobile menu.
const mainLinks = [
  { key: 'nav.overview',    to: '/' },
  { key: 'nav.skus',        to: '/sku' },
  { key: 'nav.flow',        to: '/flow' },
  { key: 'nav.dataQuality', to: '/data-quality' },
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
function closeMobile() {
  mobileOpen.value = false
}
// Auto-close the mobile sheet whenever the route changes (e.g. after a NuxtLink click).
watch(() => route.fullPath, closeMobile)

onMounted(() => document.addEventListener('click', closeMenus))
onBeforeUnmount(() => document.removeEventListener('click', closeMenus))
</script>

<template>
  <header class="bg-cream-50/80 backdrop-blur border-b border-cream-200 sticky top-0 z-30">
    <div class="px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between max-w-screen-2xl mx-auto">
      <div class="flex items-center gap-4 md:gap-8 min-w-0">
        <NuxtLink to="/" class="flex items-baseline gap-1.5 shrink-0" @click.stop>
          <span class="display text-lg text-cream-900">Purela</span>
          <span class="hidden sm:inline text-[10px] uppercase tracking-widest text-cream-500">{{ $t('nav.dashboard') }}</span>
        </NuxtLink>

        <!-- Desktop nav (hidden on mobile) -->
        <nav class="hidden md:flex items-center gap-1">
          <NuxtLink
            v-for="link in mainLinks.slice(0, 1)"
            :key="link.to"
            :to="link.to"
            :class="navClasses(route.path === link.to)"
            @click.stop
          >
            {{ $t(link.key) }}
          </NuxtLink>

          <div class="relative" @click.stop>
            <button
              :class="navClasses(isChannelActive)"
              type="button"
              @click="channelsOpen = !channelsOpen; settingsOpen = false"
            >
              {{ $t('nav.channels') }}
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
                {{ $t(link.key) }}
              </NuxtLink>
            </div>
          </div>

          <NuxtLink
            v-for="link in mainLinks.slice(1)"
            :key="link.to"
            :to="link.to"
            :class="navClasses(route.path === link.to)"
            @click.stop
          >
            {{ $t(link.key) }}
          </NuxtLink>
        </nav>
      </div>

      <!-- Desktop right-side controls -->
      <div class="hidden md:flex items-center gap-2">
        <LocaleSwitcher @click.stop />

        <NuxtLink
          to="/how-it-works"
          :class="[
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
            route.path === '/how-it-works'
              ? 'text-cream-900 font-medium'
              : 'text-cream-600 hover:text-cream-900 hover:bg-cream-100',
          ]"
          @click.stop
        >
          <Icon name="lucide:help-circle" class="size-4" />
          {{ $t('nav.howItWorks') }}
        </NuxtLink>

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
              {{ $t(link.key) }}
            </NuxtLink>
            <div class="border-t border-cream-200 my-1" />
            <button
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm text-cream-700 hover:bg-cream-100 hover:text-cream-900 text-left"
              @click="logout"
            >
              <Icon name="lucide:log-out" class="size-4 text-cream-400" />
              {{ $t('nav.logout') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile hamburger button -->
      <button
        type="button"
        class="md:hidden inline-flex items-center justify-center size-9 rounded-md text-cream-700 hover:bg-cream-100"
        :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
        :aria-expanded="mobileOpen"
        @click.stop="mobileOpen = !mobileOpen"
      >
        <Icon :name="mobileOpen ? 'lucide:x' : 'lucide:menu'" class="size-5" />
      </button>
    </div>

    <!-- Mobile slide-down menu -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="mobileOpen"
        class="md:hidden border-t border-cream-200 bg-cream-50/95 backdrop-blur"
        @click.stop
      >
        <div class="px-4 py-3 space-y-4 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <!-- Top-level pages -->
          <div class="space-y-1">
            <NuxtLink
              to="/"
              :class="[
                'block px-3 py-2 rounded-md text-sm',
                route.path === '/'
                  ? 'bg-cream-100 text-cream-900 font-medium'
                  : 'text-cream-700 hover:bg-cream-100',
              ]"
            >
              {{ $t('nav.overview') }}
            </NuxtLink>

            <!-- Channels group -->
            <div class="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-cream-500 font-medium">
              {{ $t('nav.channels') }}
            </div>
            <NuxtLink
              v-for="link in channelLinks"
              :key="link.to"
              :to="link.to"
              :class="[
                'block px-3 py-2 rounded-md text-sm',
                route.path === link.to
                  ? 'bg-cream-100 text-cream-900 font-medium'
                  : 'text-cream-700 hover:bg-cream-100',
              ]"
            >
              {{ $t(link.key) }}
            </NuxtLink>

            <NuxtLink
              v-for="link in mainLinks.slice(1)"
              :key="link.to"
              :to="link.to"
              :class="[
                'block px-3 py-2 rounded-md text-sm',
                route.path === link.to
                  ? 'bg-cream-100 text-cream-900 font-medium'
                  : 'text-cream-700 hover:bg-cream-100',
              ]"
            >
              {{ $t(link.key) }}
            </NuxtLink>
          </div>

          <!-- Settings group -->
          <div class="space-y-1 pt-2 border-t border-cream-200">
            <div class="px-3 pt-1 pb-1 text-[10px] uppercase tracking-widest text-cream-500 font-medium">
              {{ $t('nav.dashboard') }}
            </div>
            <NuxtLink
              v-for="link in settingsLinks"
              :key="link.to"
              :to="link.to"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm',
                route.path === link.to
                  ? 'bg-cream-100 text-cream-900 font-medium'
                  : 'text-cream-700 hover:bg-cream-100',
              ]"
            >
              <Icon :name="link.icon" class="size-4 text-cream-400" />
              {{ $t(link.key) }}
            </NuxtLink>
            <NuxtLink
              to="/how-it-works"
              :class="[
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm',
                route.path === '/how-it-works'
                  ? 'bg-cream-100 text-cream-900 font-medium'
                  : 'text-cream-700 hover:bg-cream-100',
              ]"
            >
              <Icon name="lucide:help-circle" class="size-4 text-cream-400" />
              {{ $t('nav.howItWorks') }}
            </NuxtLink>
          </div>

          <!-- Locale + logout -->
          <div class="pt-2 border-t border-cream-200 flex items-center justify-between gap-2">
            <LocaleSwitcher />
            <button
              type="button"
              class="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm text-cream-700 hover:bg-cream-100"
              @click="logout"
            >
              <Icon name="lucide:log-out" class="size-4 text-cream-400" />
              {{ $t('nav.logout') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>
