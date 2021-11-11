<template>
  <div id="tok-header">
    <div id="tok-back" class="btn left" @click="bindBack">
      <img src="~/assets/img/back.svg" />
    </div>
    <template v-if="provider.email">
      <!-- <div class="account sea-colorful-border">
        <div class="sea-text-overflow">{{ provider.email }}</div>
      </div> -->
      <div class="title">
        {{ $t($route.name + '.title') }}
      </div>
      <el-popover
        ref="popover"
        popper-class="tok-popover-lang"
        placement="bottom-end"
        width="168"
        trigger="click"
      >
        <div class="one" @click="bindLang">
          <img src="~/assets/img/lang.svg" />
          <span>{{ t_('lang') }}</span>
        </div>
        <!-- <div class="one" @click="bindWechat">
          <img src="~/assets/img/wechat.svg" />
          <span>{{ t_('wechat') }}</span>
        </div> -->
        <div class="one exit" @click="showClose = true">
          <img src="~/assets/img/exit.svg" />
          <span>{{ t_('logout') }}</span>
        </div>
      </el-popover>
      <div v-popover:popover class="btn right">
        <img src="~/assets/img/more.svg" />
      </div>
    </template>
    <template v-else>
      <div class="btn right" @click="bindLang">
        <img v-show="lang === 'en'" src="~/assets/img/lang-zh.svg" />
        <img v-show="lang === 'zh'" src="~/assets/img/lang-en.svg" />
      </div>
    </template>
    <el-dialog
      class="tok-dialog-close"
      :title="t_('closeTitle')"
      :visible.sync="showClose"
      :show-close="false"
      center
      top="50px"
      width="295px"
      append-to-body
    >
      <div class="btn left" @click="bindExit">{{ t_('exit') }}</div>
      <div class="btn right" @click="showClose = false">{{ t_('cancel') }}</div>
    </el-dialog>
    <follow-wechat :show.sync="showWechat" />
  </div>
</template>
<script>
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
dayjs.locale('zh-cn')

export default {
  inject: ['reload'],
  props: {
    stop: Boolean,
  },
  data() {
    return {
      showWechat: false,
      showClose: false,
      lang: 'en',
    }
  },
  computed: {
    provider() {
      return this.$store.state.provider
    },
  },
  created() {
    if (process.client) {
      this.initLang()
    }
  },
  methods: {
    t_(key) {
      return this.$t('components.header.' + key)
    },
    bindExit() {
      this.reload()
    },
    bindBack() {
      if (this.stop) {
        this.$emit('close')
      } else {
        this.$router.back()
      }
    },
    initLang() {
      let language = navigator.language || navigator.browserLanguage
      language = language.toLowerCase()
      const lang = this.$route.query.lang || localStorage.getItem('language')
      if (language.startsWith('zh')) {
        language = 'zh'
      } else if (language.startsWith('en')) {
        language = 'en'
      }
      this.bindLang(lang || language || 'en')
    },
    bindWechat() {
      document.body.click()
      this.showWechat = true
    },
    bindLang(lang) {
      const list = ['zh', 'en']
      if (!list.includes(lang)) {
        lang = this.lang === 'en' ? 'zh' : 'en'
      }
      localStorage.setItem('language', lang)
      dayjs.locale(lang === 'en' ? 'en' : 'zh-cn')
      this.$i18n.locale = lang
      this.lang = lang
      // keep-alive failure
      // this.Sea.params('lang', lang)
      for (const s of list) {
        if (s === lang) {
          document.body.classList.add(s)
        } else {
          document.body.classList.remove(s)
        }
      }
    },
  },
}
</script>
<style lang="stylus">
#tok-header {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  background: #fff;

  > .btn {
    background: #fff;
    cursor: pointer;
    padding: 0 20px;
    display: flex;
    align-items: center;
    height: 100%;
    position: absolute;
    top: 0;
  }

  > .btn.left {
    left: -20px;
  }

  > .account {
    max-width: 220px;
    height: 34px;
    line-height: 34px;
    border-radius: 17px;
    padding: 0 16px;
    text-align: center;
    font-weight: bold;
  }

  > .title {
    font-weight: bold;
    color: #333333;
  }

  > .btn.right {
    right: -20px;
  }
}

.tok-dialog-close {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.49);

  > .el-dialog {
    border-radius: 4px;

    > .el-dialog__header {
      padding: 0;
      height: 96px;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 14px;
    }

    > .el-dialog__body {
      padding: 0;
      display: flex;
      justify-content: center;
      border-top: 1px solid var(--sub);

      .btn {
        user-select: none;
        cursor: pointer;
        width: 100%;
        text-align: center;
        height: 48px;
        line-height: 48px;
        font-size: 16px;
        color: var(--text-primary);
      }

      .btn.right {
        border-left: 1px solid var(--sub);
        color: var(--primary);
        z-index: 1;
      }
    }
  }
}

.tok-popover-lang {
  margin-top: 0 !important;
  padding: 0 !important;

  .one {
    user-select: none;
    cursor: pointer;
    height: 50px;
    display: flex;
    align-items: center;
    padding: 0 16px;

    img {
      width: 20px;
      margin-right: 6px;
    }
  }

  .one +.one {
    border-top: 1px solid var(--sub);
  }
}
</style>
