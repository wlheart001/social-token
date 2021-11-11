export default {
  // Target: https://go.nuxtjs.dev/config-target
  target: 'static',

  // Global page headers: https://go.nuxtjs.dev/config-head
  head: {
    title: 'Social Token',
    meta: [
      { charset: 'utf-8' },
      {
        name: 'viewport',
        content:
          'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no',
      },
      { hid: 'description', name: 'description', content: '' },
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: 'data:image/ico;base64,aWNv' },
    ],
    script: [
      {
        src: 'https://cdn.jsdelivr.net/npm/vconsole@latest/dist/vconsole.min.js',
      },
    ],
  },

  // Global CSS: https://go.nuxtjs.dev/config-css
  css: ['@assets/css/main.scss'],

  // Global loading https://www.nuxtjs.cn/api/configuration-loading
  loading: {
    color: '#3179ff',
  },

  // Plugins to run before rendering page: https://go.nuxtjs.dev/config-plugins
  plugins: [
    '~/plugins/bigsea',
    '~/plugins/axios',
    '~/plugins/element-ui',
    '~/plugins/main',
    '~/plugins/socket',
    '~/plugins/i18n',
  ],

  // Auto import components: https://go.nuxtjs.dev/config-components
  components: true,

  // Modules for dev and build (recommended): https://go.nuxtjs.dev/config-modules
  buildModules: [
    // https://go.nuxtjs.dev/typescript
    '@nuxt/typescript-build',
    '@nuxtjs/dotenv',
    'nuxt-compress',
    '@nuxtjs/google-gtag',
  ],
  'google-gtag': {
    id: process.env.GA_TAG,
  },
  'nuxt-compress': {
    gzip: {
      threshold: 8192,
    },
    brotli: {
      threshold: 8192,
    },
  },

  // Modules: https://go.nuxtjs.dev/config-modules
  modules: [
    // https://go.nuxtjs.dev/axios
    '@nuxtjs/axios',
    // https://go.nuxtjs.dev/pwa
    // '@nuxtjs/pwa',
    // '@nuxtjs/sentry',
  ],

  // Axios module configuration: https://go.nuxtjs.dev/config-axios
  axios: {
    baseURL: process.env.API_BASE_URL,
  },

  // Content module configuration: https://go.nuxtjs.dev/config-content
  content: {},

  router: {
    base: '/',
  },

  // Build Configuration: https://go.nuxtjs.dev/config-build
  build: {
    // analyze: process.env.NODE_ENV === 'production',
    transpile: [/^element-ui/],
    // publicPath: ,
    optimization: {
      splitChunks: {
        minSize: 10000,
        maxSize: 250000,
      },
    },
  },
  env: {
    environment: process.env.NODE_ENV,
  },

  // eslint
  eslint: {
    fix: true,
  },

  // server
  server: {
    port: 5003,
  },
}
