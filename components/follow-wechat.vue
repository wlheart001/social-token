<template>
  <el-dialog
    id="dialog-qrcode-wechat"
    center
    top="calc(50vh - 220px)"
    width="350px"
    :show-close="false"
    :visible.sync="showDialog"
    append-to-body
  >
    <div class="title">{{ t_('title') }}</div>
    <img class="qrcode" src="~/assets/img/wechat.svg" />
    <div class="tip">{{ t_('scan') }}</div>
  </el-dialog>
</template>
<script>
export default {
  props: {
    show: Boolean,
  },
  computed: {
    showDialog: {
      get() {
        return this.$props.show
      },
      set(val) {
        this.$emit('update:show', val)
      },
    },
  },
  methods: {
    t_(key) {
      return this.$t(`components.wechat.${key}`)
    },
  },
}
</script>
<style lang="stylus">
#dialog-qrcode-wechat {
  .el-dialog {
    border-radius: 16px;

    .el-dialog__header {
      padding: 0;
    }

    .el-dialog__body {
      word-break: break-word;
      text-align: center;
      padding: 20px;
      display: flex;
      justify-content: flex-start;
      align-items: center;
      flex-direction: column;
      color: rgb(4, 119, 122);
      height: 440px;

      .title {
        margin-top: 20px;
        font-size: 20px;
        font-weight: bold;
      }

      .qrcode {
        margin-top: 20px;
        width: 300px;
        height: 300px;
      }

      .tip {
        font-size: 16px;
      }
    }
  }
}
</style>
