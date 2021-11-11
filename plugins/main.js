import Vue from 'vue'
import Clipboard from 'v-clipboard'
import InfiniteLoading from 'vue-infinite-loading'

import Imgs from '~/components/imgs.vue'
// directive
// https://peachscript.github.io/vue-infinite-loading/zh/guide/configure-load-msg.html
Vue.use(InfiniteLoading, {
  slots: {
    noResults: { render: (h) => h('div') },
    noMore: { render: (h) => h('div') },
    error: { render: (h) => h('div') },
  },
})
// copy
Vue.use(Clipboard)
// components
Vue.component('Imgs', Imgs)
