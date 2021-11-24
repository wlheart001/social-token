<template>
  <div id="page-send">
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
          :placeholder="t_('CKBAddress')"
          resize="none"
          :readonly="loading"
          autosize
          @keyup.enter="$refs.amount.focus()"
          @blur="bindBlur"
        >
        </el-input>
        <el-button class="scan" @click="scan">
          <img src="~/assets/img/send/scan.svg" />
        </el-button>
      </el-form-item>
      <div class="balance">{{ balance }} {{ asset.symbol }}</div>
      <el-form-item :label="t_('Money')" prop="amount">
        <el-input
          ref="amount"
          v-model.trim="form.amount"
          type="number"
          :readonly="loading"
          placeholder="0"
          @keyup.enter="bindSend"
          @blur="bindBlur"
        ></el-input>
      </el-form-item>
      <div v-loading="feeLoading" class="balance fee">{{ fee }} CKB</div>
      <el-form-item :label="t_('Fee')"></el-form-item>
    </el-form>
    <el-button
      type="primary"
      :loading="loading"
      :disabled="balance === ''"
      class="send"
      @click="bindSend"
    >
      {{ t_('Send') }}
    </el-button>
    <el-button class="stop-scan" :attr-scanning="isScanning" @click="stopScan">
      <img class="qrcode" src="~/assets/img/send/close.svg" />
    </el-button>
    <video ref="camera" playsinline :attr-scanning="isScanning" />
  </div>
</template>
<script>
import jsQR from 'jsqr'
import PWCore, {
  RPC,
  Reader,
  Address,
  AddressType,
  Amount,
  normalizers,
  SerializeWitnessArgs,
  transformers,
  AmountUnit,
  Builder,
} from '@lay2/pw-core'
import {
  getUSDTSignMessage,
  getSUDTSignCallback,
} from '~/assets/js/sudt/sudt-tranfer'
import {
  getSimpleUSDTSignMessage,
  getBalanceEnough,
} from '~/assets/js/sudt/simple-sudt-tranfer'

import { getCkbEnv } from '~/assets/js/config'
import UnipassBuilder from '~/assets/js/UnipassBuilder.ts'
import UnipassBuilderClear from '~/assets/js/UnipassBuilderClear.ts'
import UnipassSigner from '~/assets/js/UnipassSigner.ts'
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
    const checkAmount = (_rule, value, callback) => {
      if (name === 'CKB') {
        try {
          const amount = new Amount(value)
          if (amount.lt(new Amount('61'))) {
            callback(new Error(this.t_('Minimum', { data: 61 })))
            return
          }
          const asset = this.asset
          if (amount.gt(Amount.ZERO) && amount.gt(asset.capacity)) {
            callback(new Error(this.t_('LessThan')))
            return
          }
        } catch (error) {
          callback(new Error(error.message))
          return
        }
      } else {
        try {
          const asset = this.asset
          const amount = new Amount(value, this.decimals)
          if (amount.gt(Amount.ZERO) && amount.gt(asset.sudtAmount)) {
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
      fee: name === 'CKB' ? '0.00001551' : '0.00002040',
      feeRate: 1000,
      name,
      // Send all CKB
      clearCKB: false,
      nowTx: null,
      oldAmount: '',
      oldAddress: '',
      isScanning: false,
      frameId: undefined,
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
    typeHash() {
      if (this.name === 'CKB') {
        return ''
      } else {
        return this.asset.typeHash
      }
    },
    sudtTokenId() {
      if (this.asset && this.asset.typeScript) {
        return this.asset.typeScript.args
      }
      return ''
    },
  },
  beforeUnmount() {
    this.stopScan()
  },
  created() {
    const name = this.name
    if (!name) {
      this.$router.replace('/')
    }
    getBalanceEnough()
  },
  mounted() {
    if (this.balance) {
      this.loading = false
    }
    const ret = this.Sea.json(this.$route.query.unipass_ret)
    if (ret) {
      if (ret.info === 'sign success') {
        const name = this.name
        if (name === 'CKB') {
          this.sendCKBNext(ret.data.sig)
        } else {
          this.sendSTNext(ret.data.sig)
        }
      } else if (ret.info === 'sign fail') {
        this.$message.error(this.t_('RejectSign'))
      } else if (ret.info === 'pubkey not match') {
        // pubkey not match
        this.$message.error(this.t_('PubkeyMismatch'))
      } else {
        this.Sea.params('unipass_ret', '')
      }
    }

    // handle resend
    const url = new URL(window.location)
    if (!url.searchParams.has('resend')) return

    const resendHash = url.searchParams.get('resend') || ''
    const pendingList = this.Sea.localStorage('pendingList')

    const foundResendIndex = (pendingList || []).findIndex((tx) => {
      return tx.hash === resendHash && tx.type === 'pending'
    })

    if (foundResendIndex === -1) return

    const resendTx = pendingList[foundResendIndex]

    this.form.address = resendTx.to
    this.form.amount = /* format amount */ ((amount) => {
      if (this.name === 'CKB') {
        return amount
      }
      if (amount) {
        const balance = new Amount(amount, AmountUnit.shannon)
        const string = balance.toString(this.decimals, {
          commify: true,
          fixed: this.decimals >= 4 ? 4 : this.decimals || undefined,
        })
        return string
      }
      return ''
    })(resendTx.amount)

    url.searchParams.delete('resend')

    // remove resent tx in pending list
    this.Sea.localStorage('pendingList', [
      ...pendingList.slice(0, foundResendIndex),
      ...pendingList.slice(foundResendIndex + 1),
    ])

    window.history.replaceState({ path: url.href }, '', url.href)
    this.bindBlur()
  },
  methods: {
    t_(key, data = {}) {
      return this.$t('send.' + key, data)
    },
    async bindBlur() {
      const address = this.form.address
      let amount = this.form.amount
      if (amount && amount.includes('.')) {
        const dot = amount.split('.')
        if (dot[1].length > this.decimals) {
          amount = String(Number(amount).toFixed(this.decimals))
          this.form.amount = amount
        }
      }
      if (address && amount) {
        if (this.oldAmount === amount && this.oldAddress === address) {
          return
        } else {
          this.oldAmount = amount
          this.oldAddress = address
        }
        this.feeLoading = true
        try {
          if (this.name === 'CKB') {
            await this.buildCKB()
          } else {
            await this.buildST(true)
          }
        } catch (error) {}
        this.feeLoading = false
      }
    },
    async buildST(blur) {
      // check
      const provider = this.provider
      const { address, amount } = this.form
      if (address === provider.address) {
        // Collection address cannot be your own
        this.$message.error(this.t_('CannotYour'))
        this.loading = false
        return
      }
      const lockHash = new Address(address, AddressType.ckb)
        .toLockScript()
        .toHash()
      const res = await this.$axios({
        url: '/cell/unSpent',
        params: {
          lockHash,
          typeHash: this.typeHash,
          capacity: new Amount('1', AmountUnit.shannon).toHexString(),
        },
      })
      if (res.data.length === 0) {
        const enough = await getBalanceEnough()
        if (enough) {
          const getData = async () => {
            if (address && amount && this.sudtTokenId) {
              const { tx, txObj, message } = await getSimpleUSDTSignMessage(
                this.sudtTokenId,
                new Address(address, AddressType.ckb),
                new Amount(amount, this.decimals),
                provider.pubkey,
              )
              const fee = Builder.calcFee(tx, this.feeRate)
              this.fee = fee.toString(8, AmountUnit.shannon)
              return { txObj, message }
            }
          }
          const data = await getData()
          if (blur) {
            return data
          } else {
            this.$confirm(this.t_('Tip1'), this.t_('Tip1Title'), {
              confirmButtonText: this.t_('Tip1Confirm'),
              cancelButtonText: this.t_('Tip1Cancel'),
            })
              .then(() => {
                this.sendST(data)
              })
              .catch(() => {
                this.loading = false
              })
          }
        } else if (!blur) {
          this.$alert(this.t_('Tip2'), this.t_('Tip2Title'), {
            confirmButtonText: this.t_('Tip2Confirm'),
          }).then(() => {
            this.loading = false
          })
        }
      } else if (address && amount && this.sudtTokenId) {
        const { tx, txObj, message } = await getUSDTSignMessage(
          this.sudtTokenId,
          new Address(address, AddressType.ckb),
          new Amount(amount, this.decimals),
          provider.pubkey,
        )
        const fee = Builder.calcFee(tx, this.feeRate)
        this.fee = fee.toString(8, AmountUnit.shannon)
        return { txObj, message }
      }
      // build
    },
    async buildCKB() {
      const { address, amount } = this.form
      let builder
      if (this.clearCKB) {
        builder = new UnipassBuilderClear(
          new Address(address, AddressType.ckb),
          this.feeRate,
        )
      } else {
        builder = new UnipassBuilder(
          new Address(address, AddressType.ckb),
          new Amount(amount),
          this.feeRate,
        )
      }
      const tx = await builder.build()
      const fee = Builder.calcFee(tx, this.feeRate)
      this.fee = fee.toString(8, AmountUnit.shannon)
      return tx
    },
    bindSend() {
      this.loading = true
      this.$refs.form.validate((ok) => {
        if (ok) {
          this.send()
        } else {
          this.loading = false
        }
      })
    },
    send() {
      if (this.name === 'CKB') {
        this.sendCKB()
      } else {
        this.sendST()
      }
    },
    async sendST(data) {
      const provider = this.provider
      const { address, amount } = this.form
      // send
      try {
        if (!data) {
          data = await this.buildST()
        }
        if (data) {
          const { message, txObj } = data
          this.Sea.localStorage('signData', {
            txObj,
            pending: {
              from: provider.address,
              to: address,
              amount: new Amount(amount, this.decimals).toHexString(),
            },
          })
          this.sign(message, provider.pubkey)
        }
      } catch (error) {
        this.loading = false
        const message = error.message
        console.error(message)
        this.$message.error(message)
      }
    },
    async sendCKB() {
      try {
        const { address, amount } = this.form
        const tx = await this.buildCKB(address, amount)
        const signer = new UnipassSigner(PWCore.provider)
        const messages = signer.toMessages(tx)
        const message = messages[0].message
        const pubkey = this.provider.pubkey
        const txObj = transformers.TransformTransaction(tx)
        this.Sea.localStorage('signData', {
          txObj,
          pending: {
            from: this.provider.address,
            to: address,
            amount: new Amount(amount).toHexString(),
          },
        })
        this.sign(message, pubkey)
      } catch (error) {
        const message = error.message
        if (message.includes('input capacity not enough')) {
          this.$confirm(this.t_('SendAllTip'), this.t_('BeCareful'), {
            confirmButtonText: this.t_('SendAll'),
            cancelButtonText: this.t_('cancel'),
          })
            .then(() => {
              this.clearCKB = true
              const asset = this.asset
              this.form.amount = asset.capacity.toString(
                this.decimals,
                AmountUnit.shannon,
              )
              this.sendCKB()
            })
            .catch(() => {
              this.loading = false
            })
        } else {
          this.loading = false
          this.$message.error(message)
          console.error('error', message)
        }
      }
    },
    sign(message, pubkey) {
      const url = new URL(`${process.env.UNIPASS_URL}/sign`)
      url.searchParams.set('success_url', window.location.href)
      url.searchParams.set('message', message)
      url.searchParams.set('pubkey', pubkey)
      window.location.replace(url.href)
    },
    async sendCKBNext(sig) {
      this.loading = true
      try {
        let witness
        if (this.clearCKB) {
          witness = new Reader(
            SerializeWitnessArgs(
              normalizers.NormalizeWitnessArgs({
                lock: '0x00' + sig.replace('0x', ''),
                input_type: '',
                output_type: '',
              }),
            ),
          ).serializeJson()
        } else {
          witness = new Reader(
            SerializeWitnessArgs(
              normalizers.NormalizeWitnessArgs({
                lock: '0x01' + sig.replace('0x', ''),
                input_type: '',
                output_type: '',
              }),
            ),
          ).serializeJson()
        }
        const { txObj, pending } = this.Sea.localStorage('signData')
        txObj.witnesses[0] = witness
        const url = getCkbEnv()
        const rpc = new RPC(url.NODE_URL)
        const txHash = await rpc.send_transaction(txObj, 'passthrough')
        if (txHash) {
          this.$message.success(this.t_('SendSuccess'))
          this.pendingList(txHash, pending, txObj)
        } else {
          this.$message.error(this.t_('SendFailed'))
        }
      } catch (error) {
        this.$message.error(error.message)
        console.error('error', error.message)
      }
      this.Sea.params('unipass_ret', '')
      this.loading = false
    },
    async sendSTNext(sig) {
      try {
        this.loading = true
        const { txObj, pending } = this.Sea.localStorage('signData')
        const txHash = await getSUDTSignCallback(sig, txObj)
        if (txHash) {
          this.$message.success(this.t_('SendSuccess'))
          this.pendingList(txHash, pending, txObj)
        } else {
          this.$message.error(this.t_('SendFailed'))
        }
      } catch (error) {
        this.$message.error(error.message)
        console.error('error', error.message)
      }
      this.Sea.params('unipass_ret', '')
      this.loading = false
    },
    pendingList(txHash, pending, txObj) {
      const outPoints = (txObj?.inputs || []).map(
        (item) => item.previous_output,
      )

      const pendingList = this.Sea.localStorage('pendingList') || []
      pendingList.push({
        hash: txHash,
        time: Date.now(),
        from: pending.from,
        to: pending.to,
        type: 'pending',
        amount: pending.amount,
        direction: 'out',
        name: this.name,
        outPoints,
      })
      this.Sea.localStorage('pendingList', pendingList)
      const query = this.$route.query
      query.tab = 'record'
      this.$router.replace({ path: '/asset', query })
    },
    async scan() {
      if (this.isScanning) {
        return
      }
      this.isScanning = true

      try {
        const stream = await window.navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })

        if (!stream) {
          window.alert('no source found')
          return
        }

        const camera = this.$refs.camera
        const canvas = document.createElement('canvas')
        const requestAnimationFrame =
          window.requestAnimationFrame ||
          window.mozRequestAnimationFrame ||
          window.webkitRequestAnimationFrame ||
          window.msRequestAnimationFrame

        camera.srcObject = stream
        camera.play()
        const tick = () => {
          if (!this.isScanning) {
            this.stopScan()
            return
          }
          if (camera.readyState === camera.HAVE_ENOUGH_DATA && canvas) {
            canvas.width = camera.videoWidth
            canvas.height = camera.videoHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
              const rect = [0, 0, canvas.width, canvas.height]
              ctx.drawImage(camera, ...rect)
              const imageData = ctx.getImageData(...rect)
              const code = jsQR(imageData.data, rect[2], rect[3], {
                inversionAttemps: 'dontInvert',
              })
              if (code && this.isAddressValid(code.data)) {
                this.form.address = code.data
                camera.pause()
                this.stopScan()
              }
            }
          }
          this.frameId = requestAnimationFrame(tick)
        }
        this.frameId = requestAnimationFrame(tick)
      } catch (err) {
        // TODO: error message should be treated with i18n
        window.alert(err)
      }
    },
    stopScan() {
      this.isScanning = false
      this.$refs.camera.srcObject = null
      if (this.frameId) {
        const cancelAnimationFrame =
          window.cancelAnimationFrame || window.mozCancelAnimationFrame

        cancelAnimationFrame(this.frameId)
        this.frameId = undefined
      }
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
#page-send {
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

  .send {
    margin-top: 110px;
    margin-bottom: 40px;
    width: 100%;
  }
  .address {
    paddingRight: 30px;
  }
  video {
    position: absolute;
    width: 0;
    height: 0;
    left: 100%;
    top: 100%;
    &[attr-scanning='true'] {
    top: 0px;
    left: 0px;
    width: 100%;
    height 100vh;
    background: #000;
    object-fix: contain;
  }
  }
  .scan {
    display: flex;
    background: transparent;
    width: min-content;
    height: auto;
    position: absolute;
    top: 0;
    right: 0;
    height: 54px;
  }
  .stop-scan {
    z-index: 999;
    display:none;
    position: absolute;
    top: 10px;
    right: 10px;
    &[attr-scanning='true'] {
      background: transparent;
      display: flex;
    }
  }
  .scan, .stop-scan {
    justify-content: center;
    align-items: center;
    border: none;
    img {
      width: 25px;
      height: 25px;
    }
  }
  textarea[class-name='address'] {
    padding-right: 30px;
  }

}
</style>
