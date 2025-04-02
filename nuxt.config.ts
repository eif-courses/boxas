export default defineNuxtConfig({
  modules: [
    '@nuxthub/core',
    '@nuxt/ui',
    'nuxt-auth-utils',
    '@nuxt/eslint',
    '@pinia/nuxt',
    '@pinia/colada-nuxt',
    '@nuxtjs/i18n'
  ],
  devtools: {
    enabled: true
  },
  runtimeConfig: {
    public: {
      appUrl: process.env.APP_URL || 'https://boxas.nuxt.dev'
    }
  },
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2024-07-30',
  nitro: {
    experimental: {
      openAPI: true
    }
  },
  hub: {
    database: true,
    blob: true,
    kv: true
  },
  // Development config
  eslint: {
    config: {
      stylistic: {
        quotes: 'single',
        commaDangle: 'never'
      }
    }
  },
  i18n: {
    locales: [
      {
        code: 'en-GB',
        name: 'English',
        file: 'en-GB.ts',
        iso: 'en' // Add this
      },
      {
        code: 'lt-LT',
        name: 'Lietuvių',
        file: 'lt-LT.ts',
        iso: 'lt' // Add this
      }
    ],
    legacy: false,
    langDir: 'lang',
    strategy: 'prefix_and_default',
    defaultLocale: 'en-GB'
  }
})
