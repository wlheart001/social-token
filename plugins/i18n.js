import Vue from 'vue'
import VueI18n from 'vue-i18n'
import enLocale from 'element-ui/lib/locale/lang/en'
import zhLocale from 'element-ui/lib/locale/lang/zh-CN'
import ElementLocale from 'element-ui/lib/locale'

// Join Vue Global
Vue.use(VueI18n)

export default ({ app }) => {
  app.i18n = new VueI18n({
    locale: 'en',
    fallbackLocale: 'en',
    messages: {
      en: {
        ...enLocale,
        ...require('~/assets/lang/en.js'),
      },
      zh: {
        ...zhLocale,
        ...require('~/assets/lang/zh.js'),
      },
    },
  })

  // Configure component internationalization for element UI
  ElementLocale.i18n((key, value) => app.i18n.t(key, value))
}
