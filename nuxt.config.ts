export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/supabase',
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
  ],

  supabase: {
    redirect: false,
  },

  runtimeConfig: {
    public: {
      appName: 'Purela Dashboard',
    },
  },

  app: {
    head: {
      title: 'Purela Dashboard',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Purela brand performance dashboard' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },

  nitro: {
    preset: 'netlify',
  },

  typescript: {
    strict: true,
  },

  compatibilityDate: '2025-05-06',
})
