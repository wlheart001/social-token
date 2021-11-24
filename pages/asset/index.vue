<template>
  <div id="page-asset">
    <div class="info-card">
      <img
        v-if="asset.symbol === 'COOP'"
        class="bg"
        src="~/assets/img/home/coop.png"
      />
      <img v-else class="bg" src="~/assets/img/home/info-card-blur.svg" />
      <div class="top">
        <div class="left">
          <imgs class="icon" :src="asset.icon" />
          <div class="info">
            <div class="symbol">{{ asset.symbol }}</div>
            <div class="name">{{ asset.name }}</div>
          </div>
        </div>
        <div class="right">{{ balance }}</div>
      </div>
      <div class="bottom">
        <div class="btn left" @click="showQRCode = true">
          <span>{{ t_('Collection') }}</span>
          <img src="~/assets/img/asset/qrcode.svg" />
        </div>
        <div class="btn right" @click="bindSend">
          <span>{{ t_('Send') }}</span>
          <img src="~/assets/img/asset/send.svg" />
        </div>
      </div>
    </div>
    <el-tabs v-model="activeTab" class="tabs">
      <el-tab-pane class="token" :label="t_('TokenDetails')" name="token">
        <div class="user">
          <imgs class="avatar" :src="asset.issuerIcon" />
          <div class="name">{{ asset.issuerName }}</div>
          <div class="publisher sea-colorful-border">{{ t_('Publisher') }}</div>
        </div>
        <div v-if="asset.issuerSocialInfo" class="introduction">
          {{ asset.issuerSocialInfo.issuerInfo }}
        </div>
        <div class="token-info">
          <div class="info">
            <div class="left">{{ t_('TokenTotal') }}</div>
            <div class="right">
              {{ formatSupply(asset.supply) }}
            </div>
          </div>
          <div class="info">
            <div class="left">{{ t_('Circulation') }}</div>
            <div class="right">
              {{ formatSupply(asset.circulatingSupply) }}
            </div>
          </div>
          <div class="info">
            <div class="left">{{ t_('IssueDate') }}</div>
            <div class="right">
              {{ dayjs(asset.issueDate).format('YYYY-M-D') }}
            </div>
          </div>
          <div v-if="asset.issuerSocialInfo" class="info">
            <div class="left">{{ t_('SocialStyle') }}</div>
            <div class="right">
              <a
                v-if="asset.issuerSocialInfo.discord"
                :href="asset.issuerSocialInfo.discord"
                target="_blank"
              >
                <img class="icon" src="~/assets/img/asset/discord.svg" />
              </a>
              <a
                v-if="asset.issuerSocialInfo.github"
                :href="asset.issuerSocialInfo.github"
                target="_blank"
              >
                <img class="icon" src="~/assets/img/asset/github.svg" />
              </a>
              <a
                v-if="asset.issuerSocialInfo.facebook"
                :href="asset.issuerSocialInfo.facebook"
                target="_blank"
              >
                <img class="icon" src="~/assets/img/asset/facebook.svg" />
              </a>
              <a
                v-if="asset.issuerSocialInfo.twitter"
                :href="asset.issuerSocialInfo.twitter"
                target="_blank"
              >
                <img class="icon" src="~/assets/img/asset/twitter.svg" />
              </a>
            </div>
          </div>
        </div>
      </el-tab-pane>
      <el-tab-pane
        class="record"
        :label="t_('TransactionRecord')"
        name="record"
      >
        <el-radio-group v-model="direction" @change="bindDirection">
          <el-radio-button label="all">{{ t_('All') }}</el-radio-button>
          <el-radio-button label="in">{{ t_('In') }}</el-radio-button>
          <el-radio-button label="out">{{ t_('Out') }}</el-radio-button>
        </el-radio-group>
        <div class="tx-list">
          <div
            v-for="(tx, i) in formatTxList"
            :key="i"
            class="tx"
            :class="[
              formatState(tx),
              tx.type,
              isRejected(tx) ? 'rejected' : '',
            ]"
            @click="bindTx(tx)"
          >
            <span v-if="isRejected(tx)" class="state">×</span>
            <imgs
              v-else
              class="state"
              :src="require(`~/assets/img/asset/${formatState(tx)}.svg`)"
            />
            <div class="info">
              <div class="address">
                {{ formatAddress(tx.from) }}
              </div>
              <div class="time">
                {{ dayjs(tx.time).format('YYYY/M/D A h:mm') }}
              </div>
            </div>
            <div class="balance">
              <span>{{ formatBalance(tx) }}</span>
              <span
                v-if="isRejected(tx)"
                class="resend"
                @click="resend(tx, $event)"
                >resend</span
              >
            </div>
          </div>
          <div v-loading="loading" class="more">
            <div v-if="hasMore" class="load" @click="bindMore">
              {{ t_('loadMore') }}
            </div>
            <div v-else class="end">~</div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
    <Qrcode :show.sync="showQRCode" :address="address" />
    <TxItem :show.sync="showTxItem" :tx="itemTx" />
  </div>
</template>
<script>
import dayjs from 'dayjs'
import { Amount, AmountUnit } from '@lay2/pw-core'
import Qrcode from '~/components/qrcode.vue'
import TxItem from '~/components/tx.vue'
import { checkCellsIsLive } from '~/assets/js/helper'
export default {
  name: 'Asset',
  components: { Qrcode, TxItem },
  inject: ['loadAssets'],
  data() {
    return {
      name: this.$route.query.name,
      direction: 'all',
      txList: [],
      pendingList: [],
      pendingListLives: {} /* as { [txHash: string]: boolean } */,
      loading: false,
      showQRCode: false,
      showTxItem: false,
      hasMore: true,
      size: 10,
      activeTab: this.$route.query.tab || 'token',
      itemTx: {},

      refreshTxRecordInterval: null,
    }
  },
  computed: {
    address() {
      return this.$store.state.provider.address
    },
    formatTxList() {
      if (this.txList.length === 0) {
        return this.pendingList
      }
      if (this.direction === 'in') {
        return this.txList
      }
      const pendingList = []
      const pendingListAll = []
      let refresh = false
      for (let i = 0; i < this.pendingList.length; i++) {
        const pending = this.pendingList[i]
        if (pending.name !== this.name) {
          pendingListAll.push(pending)
        } else {
          const mins = dayjs().diff(dayjs(pending.time), 'minute')
          // pending Less than ten minutes
          if (mins < 10) {
            const index = this.txList.findIndex((e) => e.hash === pending.hash)
            // Not chained
            if (index === -1) {
              pendingList.push(pending)
              pendingListAll.push(pending)
            } else {
              refresh = true
            }
          }
        }
      }
      if (refresh) {
        this.loadAssets()
      }
      this.Sea.localStorage('pendingList', pendingListAll)
      const all = pendingList.concat(this.txList)
      return all
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
    lockHash() {
      return this.$store.state.lockHash
    },
    typeHash() {
      if (this.name === 'CKB') {
        return ''
      } else {
        return this.asset.typeHash
      }
    },
  },
  watch: {
    typeHash() {
      if (this.name !== 'CKB') {
        this.loadTxRecords()
      }
    },
    lockHash() {
      if (this.name === 'CKB') {
        this.loadTxRecords()
      }
    },
  },
  created() {
    const name = this.name
    if (name) {
      this.loadTxRecords()
    } else {
      this.$router.replace('/')
    }
  },
  mounted() {
    this.initPending()

    this.refreshTxRecordInterval = setInterval(() => {
      this.refreshTxRecords()
    }, 1000 * 3)
  },
  beforeDestroy() {
    clearInterval(this.refreshTxRecordInterval)
  },
  methods: {
    dayjs,
    t_(key) {
      return this.$t('asset.' + key)
    },
    initPending() {
      const pendingList = this.Sea.localStorage('pendingList')
      if (pendingList) {
        this.pendingList = pendingList
      }
    },
    formatSupply(supply) {
      if (this.name === 'CKB') {
        return supply
      }
      if (supply) {
        const balance = new Amount(supply, AmountUnit.shannon)
        const string = balance.toString(this.decimals, {
          commify: true,
          fixed: this.decimals >= 4 ? 4 : this.decimals || undefined,
        })
        return string
      }
      return ''
    },
    formatBalance(tx) {
      const balance = new Amount(tx.amount, AmountUnit.shannon)
      const string = balance.toString(this.decimals, {
        commify: true,
        fixed: this.decimals >= 4 ? 4 : this.decimals || undefined,
      })
      const op = tx.direction === 'out' ? '-' : '+'
      return op + string
    },
    formatState(tx) {
      if (tx.type === 'pending') {
        return 'pending'
      }
      return tx.direction
    },
    formatAddress(address) {
      const start = address.slice(0, 8)
      const end = address.slice(-8)
      return `${start}...${end}`
    },
    bindSend() {
      this.$router.push({
        path: '/send',
        query: this.$route.query,
      })
    },
    bindTx(tx) {
      if (tx.type === 'pending') {
        console.log('txHash', process.env.CKB_EXPLORER_URL + tx.hash)
        this.$message.info(this.t_('Pending'))
        return
      }
      this.itemTx = tx
      this.showTxItem = true
    },
    bindMore() {
      const last = this.txList.slice(-1)[0]
      if (last) {
        this.loadTxRecords(last.id)
      }
    },
    bindDirection() {
      this.txList = []
      this.loadTxRecords()
    },
    async loadTxRecords(lastTxId) {
      if (!this.lockHash) {
        return
      }
      if (!this.typeHash && this.name !== 'CKB') {
        return
      }
      this.loading = true
      const res = await this.$axios({
        url: '/cell/txListV2',
        params: {
          lockHash: this.lockHash,
          typeHash: this.typeHash,
          lastTxId: lastTxId || '9999999999',
          size: this.size,
          direction: this.direction,
        },
      })
      this.loading = false
      if (res.code === 200) {
        if (lastTxId) {
          this.txList.push(...res.data)
        } else {
          this.txList = res.data
        }
        if (res.data.length < this.size) {
          this.hasMore = false
        } else {
          this.hasMore = true
        }
      } else {
        this.$message.error(this.t_('RequestFailed'))
      }
    },
    async refreshTxRecords() {
      const res = await this.$axios({
        url: '/cell/txListV2',
        params: {
          lockHash: this.lockHash,
          typeHash: this.typeHash,
          lastTxId: '9999999999',
          size: this.size,
          direction: this.direction,
        },
      })

      const outPoints = this.pendingList.flatMap((item) => item.outPoints)
      const outPointsLives = await checkCellsIsLive(outPoints)

      let offset = 0
      this.pendingListLives = this.pendingList.reduce((result, pendingItem) => {
        result[pendingItem.hash] = outPointsLives
          .slice(offset, offset + pendingItem.outPoints.length)
          .every((isLive) => isLive)
        offset += pendingItem.outPoints.length
        return result
      }, {})

      if (res.code === 200) {
        const pendingList = this.Sea.localStorage('pendingList')
        if (pendingList) {
          for (let i = 0; i < this.pendingList.length; i++) {
            const pending = this.pendingList[i]
            const index = res.data.findIndex((e) => e.hash === pending.hash)
            // Chained
            if (index !== -1) {
              this.loadTxRecords()
            }
          }
        }
      }
    },
    isRejected(tx) {
      return tx.type === 'pending' && this.pendingListLives[tx.hash] === false
    },
    resend(tx, event) {
      event.stopPropagation()
      this.$router.push({
        path: '/send',
        query: {
          resend: tx.hash,
          ...this.$route.query,
        },
      })
    },
  },
  sockets: {
    connect() {
      // console.log('socket-connect')
    },
    newBlock() {
      // console.log('socket-newTx', data)
    },
    newTx() {
      this.refreshTxRecords()
    },
    disconnect() {
      // console.log('socket-disconnect')
    },
    reconnect() {
      this.$socket.emit('connect')
    },
  },
}
</script>
<style lang="stylus">
#page-asset {
  .info-card {
    margin-top: 30px;
    display: flex;
    min-width: 100%;
    min-height: 168px;
    position: relative;
    color: white;

    .bg {
      width: 100%;
    }

    .top {
      position: absolute;
      top: 30px;
      left: 14px;
      right: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .left {
        display: flex;
        align-items: center;

        .icon {
          width: 42px;
          height: 42px;
          padding: 9px;
          background: white;
          border-radius: 10px;
          // border: 1px solid #E9F0FF;
        }

        .info {
          font-size: 14px;
          margin-left: 8px;

          .name {
            margin-top: 4px;
          }
        }
      }

      .right {
      }
    }

    .bottom {
      position: absolute;
      bottom: 18px;
      left: 12px;
      right: 12px;
      display: flex;
      justify-content: space-around;
      color: #3179FF;

      .btn {
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 142px;
        height: 38px;
        background: #FFFFFF;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 600;
        color: #3179FF;
        line-height: 20px;

        img {
          margin-left: 5px;
        }
      }
    }
  }

  .tabs {
    margin-top: 21px;
    border-radius: 14px;
    width: 100%;
    background: white;
    margin-bottom: 20px;

    .el-tabs__header {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;

      .el-tabs__item {
        height: 52px;
        line-height: 52px;
        font-size: 16px;
        font-weight: 600;
        color: #999999;
      }

      .el-tabs__item.is-active {
        color: #333333;
      }

      .el-tabs__active-bar {
        // width: 36px !important;
        height: 4px;
        // margin: 0 14px;
        background: linear-gradient(320deg, #1C7BFF 0%, #9D6FFF 100%);
        border-radius: 2px;
      }

      .el-tabs__nav-wrap::after {
        background-color: transparent;
      }
    }

    .el-tab-pane {
      width: 100%;
      padding: 0 20px;

      .el-radio-group {
        height: 32px;
        border-radius: 16px;
        border: 1px solid #E9F0FF;
        overflow: hidden;
        display: flex;
        justify-content: space-between;

        .el-radio-button {
          flex: 1;

          .el-radio-button__inner {
            width: 100%;
            border: 0;
            box-shadow: none;
            padding: 0;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            transition: none;
            color: #666666;
            background: #FFFFFF;
          }
        }

        .el-radio-button.is-active {
          .el-radio-button__inner {
            border-radius: 16px;
            background: linear-gradient(320deg, #1C7BFF 0%, #9D6FFF 100%);
            color: #FFFFFF;
          }
        }
      }
    }

    .token {
      .user {
        display: flex;
        align-items: center;

        .avatar {
          width: 36px;
          border-radius: 50%;
          height: 36px;
          border: 1px solid #E9F0FF;
        }

        .name {
          font-size: 14px;
          font-weight: bold;
          color: #333333;
          margin-left: 8px;
        }

        .publisher {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: auto;
          width: 58px;
          height: 26px;
          border-radius: 14px;
          font-size: 12px;
          color: #3179FF;
        }
      }

      .introduction {
        margin-top: 16px;
        font-size: 14px;
        font-family: SFProText-Regular, SFProText;
        font-weight: 400;
        color: #666666;
        line-height: 22px;
        margin-bottom: 16px;
      }

      .token-info {
        margin-bottom: 20px;

        .info {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: bold;
          color: #333333;
          line-height: 20px;

          .left {
            flex-shrink: 0;
          }

          .right {
            display: flex;

            .icon {
              margin-left: 12px;
              width: 20px;
              height: 20px;
            }
          }
        }
      }
    }

    .record {
      .tx-list {
        margin-top: 20px;
        width: 100%;
        min-height: 200px;

        .tx {
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: center;

          .state {
            width: 20px;
            height: 20px;
          }

          .info {
            margin-left: 4px;

            .address {
              font-size: 14px;
              font-weight: bold;
              color: #333333;
              line-height: 20px;
            }

            .time {
              margin-top: 4px;
              color: #B8B8B8;
              font-size: 12px;
              line-height: 14px;
            }
          }

          .balance {
            font-size: 14px;
            font-weight: bold;
            margin-left: auto;
          }

          .resend {
            opacity: 1;
            margin-left: auto;
            border-radius: 4px;
            padding: 4px;
            font-size: 12px;
            color: #3179FF;
            line-height: 20px;
          }
        }

        .tx:hover {
          background: #f6f7fb;
        }

        .tx.pending {
          // cursor: not-allowed;
          opacity: 0.6;
        }

        .more {
          text-align: center;
          margin: 10px 0;

          .load {
            cursor: pointer;
            cursor: pointer;
            font-size: 14px;
            color: #333;
          }
        }
      }
    }
  }
}
</style>
