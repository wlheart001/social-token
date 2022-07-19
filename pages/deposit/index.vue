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
          @keyup.enter="bindDepositAllToGodwoken"
        >
        </el-input>
      </el-form-item>
      <div class="balance">{{ balance }} {{ asset.symbol }}</div>
      <el-form-item :label="t_('Money')" prop="amount"></el-form-item>
      <div v-loading="feeLoading" class="balance fee">{{ fee }} CKB</div>
      <el-form-item :label="t_('Fee')"></el-form-item>
    </el-form>
    <el-button
      type="primary"
      :loading="loading"
      :disabled="form.address === ''"
      class="deposit"
      @click="bindDepositAllToGodwoken"
    >
      {{ t_('Deposit') }}
    </el-button>
  </div>
</template>
<script>
import PWCore, {
  Address,
  AddressType,
  Amount,
  AmountUnit,
  Builder,
  HashType,
  Reader,
  RPC,
  Script,
  SerializeWitnessArgs,
  normalizers,
  transformers,
} from '@lay2/pw-core'
import UnipassBuilder from '~/assets/js/UnipassBuilder.ts'
import UnipassBuilderClear from '~/assets/js/UnipassBuilderClear.ts'
import UnipassSigner from '~/assets/js/UnipassSigner.ts'
import { buildDepositSudtSignMessage, minCkbToDeposit } from '~/assets/js/sudt/deposit-sudt-builder'
import { getSUDTSignCallback } from '~/assets/js/sudt/sudt-tranfer'
import { isCkbEnough } from '~/assets/js/sudt/utils'

export default {
  data() {
    const name = this.$route.query.name
    const checkAddress = (_rule, value, callback) => {
      try {
        if (value.startsWith('ckb') || value.startsWith('ckt')) {
          // eslint-disable-next-line no-new
          new Address(value, AddressType.ckb)
          callback()
        } else if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
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
      },
      feeLoading: false,
      loading: false,
      form: {
        address: '',
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
    sudtTokenId() {
      if (this.asset && this.asset.typeScript) {
        return this.asset.typeScript.args
      }
      return ''
    },
    godwoken_bridge_url() {
      if (process.env.NODE_ENV === 'development') {
        return process.env.GODWOKEN_BRIDGE_TESTNET
      } else {
        return process.env.GODWOKEN_BRIDGE_MAINNET
      }
    }
  },
  beforeUnmount() {
  },
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
        const name = this.name
        this.sendDepositAllToGwTx(ret.data.sig)
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
    async bindDepositAllToGodwoken() {
      try {
        await this.depositAllToGodwoken()
      } catch (error) {
        const message = error.message
        console.error(message)
        this.loading = false
        this.$message.error(message)
      }
    },
    async depositAllToGodwoken() {
      if (this.loading) {
        return
      }
      this.loading = true

      const provider = this.provider
      const toAddress = this.getGodwokenDepositLock().toAddress().toCKBAddress()

      const enough = await isCkbEnough(minCkbToDeposit)

      if (enough) {
        if (toAddress && this.sudtAmount && this.sudtTokenId) {
          const { tx, txObj, message } = await buildDepositSudtSignMessage(
            this.sudtTokenId,
            new Address(toAddress, AddressType.ckb),
            this.sudtAmount,
            provider.pubkey,
          )
          const fee = Builder.calcFee(tx, this.feeRate)
          this.fee = fee.toString(8, AmountUnit.shannon)
          this.Sea.localStorage('depositAllToGwTx', txObj)
          this.sign(message, provider.pubkey)
          console.log("sign: " + message)
        } else if (!this.sudtAmount || this.sudtAmount == 0) {
          this.$alert(this.t_('TipSudtAmountZero'), this.t_('TipTitleNote'), {
            confirmButtonText: this.t_('TipConfirm'),
          }).then(() => {
            this.loading = false
          })
        }
      } else {
        this.$alert(this.t_('TipCkbInsufficient'), this.t_('TipTitleNote'), {
          confirmButtonText: this.t_('TipConfirm'),
        }).then(() => {
          this.loading = false
        })
      }
    },
    // Todo: Get Godwoken deposit lock by SDK
    getGodwokenDepositLock() {
      return new Script(
        '0x50704b84ecb4c4b12b43c7acb260ddd69171c21b4c0ba15f3c469b7d143f6f18',
        '0x702359ea7f073558921eb50d8c1c77e92f760c8f8656bde4995f26b8963e2dd8a900000014000000340000009d000000a500000017c2cc949b24bbc469d20617839cfabc0665e379dee18eae03a77801f8eb09416900000010000000300000003100000007521d0aa8e66ef441ebc31204d86bb23fc83e9edc58c19dbb1b0ebe64336ec00134000000702359ea7f073558921eb50d8c1c77e92f760c8f8656bde4995f26b8963e2dd8c094f55971bbf9974bea6bd7b9d4c35f6b5437dc803a0900000000c002000000',
        HashType.type,
      )
    },
    sign(message, pubkey) {
      const url = new URL(`${process.env.UNIPASS_URL}/sign`)
      url.searchParams.set('success_url', window.location.href)
      url.searchParams.set('message', message)
      url.searchParams.set('pubkey', pubkey)
      window.location.replace(url.href)
    },
    async sendDepositAllToGwTx(sig) {
      try {
        const txObj = this.Sea.localStorage('depositAllToGwTx')
        const txHash = await getSUDTSignCallback(sig, txObj)
        console.log("deposit all to gw. tx hash: " + txHash)
        if (txHash) {
          this.$alert(this.t_('TipDeposit') + this.godwoken_bridge_url,
            this.t_('TipTitleTransactionSuccess'), {
            confirmButtonText: this.t_('TipConfirm'),
          }).then(() => {
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
