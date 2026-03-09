// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@pinia/nuxt',
    '@nuxtjs/supabase'
  ],

  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    fallback: 'light'
  },

  runtimeConfig: {
    // Private keys are only available on the server
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    groqApiKey: process.env.GROQ_API_KEY,
    openrouterApiKey: process.env.OPENROUTER_API_KEY
  },

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  compatibilityDate: '2024-07-11',

  vite: {
    optimizeDeps: {
      include: [
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-view',
        '@nuxt/ui > prosemirror-gapcursor'
      ]
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  supabase: {
    redirectOptions: {
      login: '/signin',
      callback: '/auth/callback',
      exclude: ['/signin', '/auth/callback']
    }
  }
})
