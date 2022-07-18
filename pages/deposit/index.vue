<template>
  <div id="page-deposit">
    <el-form
      ref="form"
      :rules="rules"
      label-position="top"
      :model="form"
      class="form"
      @submit.native.prevent
    >
      <el-form-item :label="t_('CollectionAddress')" prop="address">
        <el-input
          ref="address"
          v-model.trim="form.address"
          class-name="address"
          type="textarea"
          :placeholder="t_('ETHAddress')"
          resize="none"
          :readonly="loading"
          autosize
          @keyup.enter="$refs.amount.focus()"
        >
        </el-input>
      </el-form-item>
      <div class="balance">{{ balance }} {{ asset.symbol }}</div>
      <el-form-item :label="t_('Money')" prop="amount">
        <el-input
          ref="amount"
          v-model.trim="form.amount"
          type="number"
          :readonly="loading"
          placeholder="0"
          @keyup.enter="bindDepositToGodwoken"
        ></el-input>
      </el-form-item>
      <div v-loading="feeLoading" class="balance fee">
        {{ exchangeSudtAmountStr }} {{ asset.symbol }}
      </div>
      <el-form-item :label="t_('Fee')"></el-form-item>
    </el-form>
    <el-button
      type="primary"
      :loading="loading"
      :disabled="form.address === ''"
      class="deposit"
      @click="bindDepositToGodwoken"
    >
      {{ t_('Deposit') }}
    </el-button>
  </div>
</template>
<script>
import { BigNumber } from 'bignumber.js'
import { Address, AddressType, Amount, AmountUnit } from '@lay2/pw-core'
import {
  buildSignMessage,
  requestTx,
} from '~/assets/js/sudt/deposit-sudt-builder'
import { sendTx } from '~/assets/js/sudt/sudt-tranfer'
import { generateDepositLock } from '~/assets/js/sudt/deposit-lock-generator'
import { parseToAddress, parseToLomusScript } from '~/assets/js/utils'

export default {
  data() {
    const name = this.$route.query.name
    const checkAddress = (_rule, value, callback) => {
      try {
        if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
          // eslint-disable-next-line no-new
          new Address(value, AddressType.eth)
          callback()
        } else {
          callback(new Error(this.t_('BadAddress')))
        }
      } catch (error) {
        callback(new Error(this.t_('BadAddress')))
      }
    }
    const checkAmount = (_rule, value, callback) => {
      try {
        const asset = this.asset
        const amount = new Amount(value, this.decimals)
        const neededSudtAmount = amount.add(this.exchangeSudtAmount)
        if (
          neededSudtAmount.gt(Amount.ZERO) &&
          neededSudtAmount.gt(asset.sudtAmount)
        ) {
          callback(new Error(this.t_('LessThan')))
          return
        }
      } catch (error) {
        const message = error.message
        if (message.includes('is smaller than the digits number of')) {
          callback(new Error(this.t_('Maximum', { data: this.decimals })))
        } else if (message.includes('Cannot convert')) {
          callback(new Error(this.t_('Integer')))
        } else {
          callback(new Error(message))
        }
        return
      }
      callback()
    }
    return {
      rules: {
        address: [
          {
            required: true,
            message: this.t_('PleaseAddress'),
            trigger: 'change',
          },
          { validator: checkAddress, trigger: 'change' },
        ],
        amount: [
          {
            required: true,
            message: this.t_('PleaseMoney'),
            trigger: 'change',
          },
          { validator: checkAmount, trigger: 'change' },
        ],
      },
      feeLoading: false,
      loading: false,
      form: {
        address: '',
        amount: '',
      },
      fee: '0.00002040',
      feeRate: 1000,
      name,
    }
  },
  computed: {
    provider() {
      return this.$store.state.provider
    },
    asset() {
      const assets = this.$store.state.assets
      for (const asset of assets) {
        if (asset.symbol === this.name) {
          return asset
        }
      }
      return {}
    },
    decimals() {
      return this.asset.decimals || AmountUnit.shannon
    },
    balance() {
      const asset = this.asset
      if (asset.symbol) {
        const balance = asset.sudt ? asset.sudtAmount : asset.capacity
        return balance.toString(this.decimals, {
          commify: true,
          fixed: this.decimals >= 4 ? 4 : this.decimals || undefined,
        })
      }
      return ''
    },
    sudtAmount() {
      return this.asset.sudtAmount
    },
    exchangeSudtAmount() {
      return new Amount(process.env.EXCHANGE_SUDT_AMOUNT, 0)
    },
    exchangeSudtAmountStr() {
      const amount = new BigNumber(process.env.EXCHANGE_SUDT_AMOUNT).div(
        new BigNumber('1' + '0'.repeat(this.decimals)),
      )
      return new Amount(amount).toString(this.decimals, {
        commify: true,
        fixed: this.decimals >= 4 ? 4 : this.decimals || undefined,
      })
    },
    sudt() {
      if (this.asset && this.asset.typeScript) {
        return this.asset.typeScript
      }
      return ''
    },
    sudtTokenId() {
      if (this.asset && this.asset.typeScript) {
        return this.asset.typeScript.args
      }
      return ''
    },
    isTestNet() {
      return process.env.NETWORK_TYPE === 'TESTNET'
    },
    godwokenBridgeUrl() {
      return process.env.GODWOKEN_BRIDGE_URL
    },
  },
  beforeUnmount() {},
  created() {
    const name = this.name
    if (!name) {
      this.$router.replace('/')
    }
  },
  mounted() {
    if (this.balance) {
      this.loading = false
    }
    const ret = this.Sea.json(this.$route.query.unipass_ret)
    if (ret) {
      if (ret.info === 'sign success') {
        this.sendDepositToGwTx(ret.data.sig)
      } else if (ret.info === 'sign fail') {
        this.$message.error(this.t_('RejectSign'))
      } else if (ret.info === 'pubkey not match') {
        // pubkey not match
        this.$message.error(this.t_('PubkeyMismatch'))
      } else {
        this.Sea.params('unipass_ret', '')
      }
    }
  },
  methods: {
    t_(key, data = {}) {
      return this.$t('deposit.' + key, data)
    },
    async bindDepositToGodwoken() {
      try {
        await this.depositToGodwoken()
      } catch (error) {
        const message = error.message
        console.error(message)
        this.$alert(message, this.t_('TipTitleNote'), {
          confirmButtonText: this.t_('TipConfirm'),
        }).then(() => {
          this.loading = false
        })
      }
    },
    async depositToGodwoken() {
      if (this.loading) {
        return
      }
      this.loading = true

      if (!this.sudt) {
        this.$alert(this.t_('TipInvalidSudt'), this.t_('TipTitleNote'), {
          confirmButtonText: this.t_('TipConfirm'),
        }).then(() => {
          this.loading = false
        })
        return
      }

      const provider = this.provider
      const toAddress = generateDepositLock(this.form.address, this.isTestNet)
        .toAddress()
        .toCKBAddress()
      const amount = new Amount(this.form.amount, this.decimals)
      const neededSudtAmount = amount.add(this.exchangeSudtAmount)

      const sudtEnough = neededSudtAmount.lte(this.sudtAmount)

      if (!sudtEnough) {
        this.$alert(this.t_('TipSudtInsufficient'), this.t_('TipTitleNote'), {
          confirmButtonText: this.t_('TipConfirm'),
        }).then(() => {
          this.loading = false
        })
        return
      }

      const sudt = {
        code_hash: this.sudt.codeHash,
        hash_type: this.sudt.hashType,
        args: this.sudt.args,
      }
      const tx = await requestTx(
        sudt,
        provider.address,
        toAddress,
        this.exchangeSudtAmount.toHexString(),
        amount.toHexString(),
      )
      const { txObj, messages } = await buildSignMessage(tx, provider.pubkey)
      console.log('messages: %o', messages)
      this.Sea.localStorage('depositToGwTx', txObj)
      this.Sea.localStorage('depositSignMessages', messages)

      let message = ''
      for (const msg of messages) {
        if (parseToAddress(!this.isTestNet, parseToLomusScript(msg.lock)) === provider.address) {
          message = msg.message
          console.log('sign: ' + message)
          break
        }
      }
      if (message === '') {
        console.error('sign message empty!')
        this.$message.error(this.t_('InvalidSignMsg'))
        return
      }
      this.sign(message, provider.pubkey)
      console.log('sign message: ' + message)
    },
    sign(message, pubkey) {
      const url = new URL(`${process.env.UNIPASS_URL}/sign`)
      url.searchParams.set('success_url', window.location.href)
      url.searchParams.set('message', message)
      url.searchParams.set('pubkey', pubkey)
      window.location.replace(url.href)
    },
    async sendDepositToGwTx(sig, myAddr) {
      try {
        const provider = this.Sea.localStorage('provider')
        const txObj = this.Sea.localStorage('depositToGwTx')
        const signMsgs = this.Sea.localStorage('depositSignMessages')
        const txHash = await sendTx(sig, !this.isTestNet, txObj, provider.address, signMsgs)
        console.log('deposit to gw. tx hash: ' + txHash)
        if (txHash) {
          this.$alert(
            this.t_('TipDeposit') + this.godwokenBridgeUrl,
            this.t_('TipTitleTransactionSuccess'),
            {
              confirmButtonText: this.t_('TipConfirm'),
            },
          ).then(() => {
            this.$router.replace('/')
          })
        } else {
          this.$message.error(this.t_('TransactionFailed'))
        }
      } catch (error) {
        this.$message.error(error.message)
        console.error('error', error.message)
      }
      this.Sea.params('unipass_ret', '')
    },
    isAddressValid(address) {
      if (!address) {
        return false
      }

      try {
        if (address.startsWith('ckb') || address.startsWith('ckt')) {
          // eslint-disable-next-line no-new
          new Address(address, AddressType.ckb)
          return true
        }
        if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
          // eslint-disable-next-line no-new
          new Address(address, AddressType.eth)
          return true
        }
        return false
      } catch (error) {
        return false
      }
    },
  },
}
</script>
<style lang="stylus">
#page-deposit {
  .form {
    margin-top: 30px;

    .balance {
      display: flex;
      justify-content: flex-end;
      font-size: 14px;
      font-weight: 600;
      color: #3179FF;
      line-height: 20px;
      margin-top: 70px;
      margin-bottom: -21px;
    }

    .balance.fee {
      color: var(--text-regular);
      margin-top: 40px;
    }
  }

  .deposit {
    margin-top: 110px;
    margin-bottom: 40px;
    width: 100%;
  }
  .address {
    paddingRight: 30px;
  }
  textarea[class-name='address'] {
    padding-right: 30px;
  }

}
</style>
