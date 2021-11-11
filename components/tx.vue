<template>
  <el-dialog
    id="dialog-tx"
    :show-close="false"
    fullscreen
    :modal="false"
    :visible.sync="showDialog"
    append-to-body
    @close="$emit('close')"
  >
    <Header class="tx" stop @close="showDialog = false" />
    <div class="tip">
      <div class="right">
        <img src="~/assets/img/right.svg" />
      </div>
      <div class="info">
        <div class="title">{{ t_('title') }}</div>
        <div class="date">{{ dayjs(tx.time).format('YYYY/M/D A h:mm') }}</div>
      </div>
    </div>
    <div class="box">
      <div class="balance">{{ formatBalance(tx) }} {{ asset.symbol }}</div>
      <div class="one">
        <div class="label">{{ t_('from') }}</div>
        <div class="value">{{ tx.from }}</div>
      </div>
      <div class="one">
        <div class="label">{{ t_('to') }}</div>
        <div class="value">{{ tx.to }}</div>
      </div>
      <div class="one">
        <div class="label">{{ t_('fee') }}</div>
        <div class="value">{{ formatFee(tx.fee) }} CKB</div>
      </div>
      <div class="one">
        <div class="label">{{ t_('hash') }}</div>
        <div class="value">{{ tx.hash }}</div>
      </div>
      <div class="one">
        <div class="label">{{ t_('block') }}</div>
        <div class="value">{{ tx.blockNumber }}</div>
      </div>
      <div class="one">
        <div class="label">{{ t_('remark') }}</div>
        <div class="value">{{ tx.remark || '-' }}</div>
      </div>
    </div>
    <a class="explorer" :href="`${CKB_EXPLORER_URL}${tx.hash}`" target="_blank">
      <img src="~/assets/img/explorer.svg" />
      <span>{{ t_('browser') }}</span>
    </a>
  </el-dialog>
</template>
<script>
import { Amount, AmountUnit } from '@lay2/pw-core'
import dayjs from 'dayjs'
import Header from '~/components/header.vue'
export default {
  components: { Header },
  props: {
    tx: {
      type: Object,
      default: () => {
        return {}
      },
    },
    show: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      CKB_EXPLORER_URL: process.env.CKB_EXPLORER_URL,
    }
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
    asset() {
      const assets = this.$store.state.assets
      const name = this.$route.query.name
      for (const asset of assets) {
        if (asset.symbol === name) {
          return asset
        }
      }
      return {}
    },
  },
  methods: {
    dayjs,
    t_(key) {
      return this.$t('components.tx.' + key)
    },
    formatBalance(tx) {
      const asset = this.asset
      if (tx.amount) {
        const balance = new Amount(tx.amount, AmountUnit.shannon)
        const string = balance.toString(asset.decimals, {
          commify: true,
          fixed: asset.decimals >= 4 ? 4 : asset.decimals || undefined,
        })
        const op = tx.direction === 'out' ? '-' : '+'
        return op + string
      }
      return ''
    },
    formatFee(fee) {
      const amount = new Amount(`${fee > 0 ? fee : 0}`, AmountUnit.shannon)
      // CKB
      return amount.toString(8, AmountUnit.shannon)
    },
  },
}
</script>
<style lang="stylus">
#dialog-tx {
  > .el-dialog {
    > .el-dialog__header {
      padding: 0;
    }

    > .el-dialog__body {
      display: flex;
      align-items: center;
      flex-direction: column;
      min-height: 100vh;
      padding: 0 20px;
      background: #f6f7fb;
    }
  }

  .tip {
    margin-top: 18px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 32px 0;
    background: #fff;
    width: 100%;
    border-radius: 12px;

    .right {
      border-radius: 50%;
      width: 42px;
      height: 42px;
      background: linear-gradient(315deg, #0FDCDF 0%, #0FDF9C 100%);
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .info {
      margin-left: 10px;

      .title {
        font-size: 16px;
        font-weight: 600;
        color: #333333;
        line-height: 20px;
      }

      .date {
        margin-top: 6px;
        font-size: 12px;
        font-weight: 400;
        color: #666666;
        line-height: 14px;
      }
    }
  }

  .box {
    margin-top: 22px;
    width: 100%;
    padding: 25px 0;
    background: #FFFFFF;
    border-radius: 16px;

    .balance {
      font-size: 18px;
      font-weight: bold;
      color: #3179FF;
      line-height: 20px;
      text-align: center;
    }

    .one {
      margin-top: 20px;
      margin-left: 20px;
      margin-right: 20px;
      font-size: 14px;
      font-weight: 500;
      line-height: 20px;

      .label {
        color: #999999;
      }

      .value {
        margin-top: 4px;
        color: #333333;
      }
    }
  }

  .explorer {
    margin-top: 20px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    font-size: 14px;
    font-weight: 500;
    color: #3179FF;
    line-height: 20px;

    span {
      margin-left: 2px;
    }
  }
}
</style>
