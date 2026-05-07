export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/supabase',
    '@nuxt/icon',
    'nuxt-auth-utils',
  ],

  // Tailwind is wired directly via postcss.config.cjs + assets/css/tailwind.css.
  // We skip @nuxtjs/tailwindcss because its default CSS injection trips
  // a postcss "import.meta" parse error on Node 22.0.0 + Vite 6.
  css: ['~/assets/css/tailwind.css'],

  // The @nuxtjs/supabase module reads SUPABASE_URL, SUPABASE_KEY (anon),
  // and SUPABASE_SERVICE_KEY directly from env. Server routes use
  // serverSupabaseServiceRole(event) from #supabase/server for privileged
  // operations; the anon client is available client-side via useSupabaseClient.
  supabase: {
    redirect: false,
  },

  runtimeConfig: {
    dashboardPassword: '',  // NUXT_DASHBOARD_PASSWORD
    // nuxt-auth-utils reads NUXT_SESSION_PASSWORD automatically.
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
        // Source Serif 4 for display headings, Inter for body — matches the
        // "calm, paper-like" aesthetic.
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap',
        },
      ],
    },
  },

  nitro: {
    preset: 'netlify',
    // papaparse's UMD wrapper trips rollup's CJS parser; xlsx is huge.
    // Keep both out of the rollup bundle and let Nitro require them at runtime.
    rollupConfig: {
      external: ['papaparse', 'xlsx'],
    },
  },

  typescript: {
    strict: true,
  },

  compatibilityDate: '2025-05-06',
})
