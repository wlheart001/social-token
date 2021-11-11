<template>
  <el-dialog
    id="dialog-tok-qrcode"
    :title="t_('UniPassAddress')"
    center
    :visible.sync="showQRCode"
    width="100%"
    top="0"
    append-to-body
  >
    <img class="qrcode" :src="QRCode" alt="QRCode" />
    <div class="address" @click="bindAddressCopy">
      <span>{{ formatAddress }}</span>
      <i class="el-icon-copy-document"></i>
    </div>
  </el-dialog>
</template>

<script>
import QRCode from 'qrcode'
export default {
  props: {
    address: {
      type: String,
      require: true,
      default: () => {
        return ''
      },
    },
    show: {
      type: Boolean,
      require: true,
    },
  },
  data() {
    return {
      QRCode: '',
    }
  },
  computed: {
    showQRCode: {
      get() {
        return this.$props.show
      },
      set(val) {
        this.$emit('update:show', val)
      },
    },
    formatAddress() {
      const address = this.address
      if (address) {
        this.initQRCode()
        const start = this.address.slice(0, 9)
        const end = this.address.slice(-6)
        return `${start}...${end}`
      } else {
        return ''
      }
    },
  },
  methods: {
    t_(key) {
      return this.$t('components.qrcode.' + key)
    },
    async initQRCode() {
      // https://www.npmjs.com/package/qrcode#example-1
      const url = await QRCode.toDataURL(this.address, {
        type: 'image/png',
        width: 360,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
      this.QRCode = url
    },
    bindAddressCopy() {
      this.$clipboard(this.address)
      this.$message.success(this.t_('CopySuccess'))
    },
  },
}
</script>

<style lang="stylus">
#dialog-tok-qrcode {
  .el-dialog__body {
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
    color: #000;

    .qrcode {
      width: 180px;
      height: 180px;
      background: #eee;
      border: 2px dashed #000;
    }

    .address {
      margin-top: 20px;
      font-weight: 500;
      cursor: pointer;

      i {
        margin-left: 4px;
      }
    }
  }
}
</style>
