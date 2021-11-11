<template>
  <div id="page-index">
    <div class="info-card">
      <img class="bg" src="~/assets/img/home/info-card-blur.svg" />
      <div class="top">
        <div class="left">
          <div class="welcome">{{ t_('Welcome') }}</div>
          <div class="email">{{ provider.email }}</div>
        </div>
      </div>
      <div class="bottom">
        <div class="left" @click="showQRCode = true">
          <img class="qrcode" src="~/assets/img/home/qrcode.svg" />
        </div>
      </div>
    </div>
    <div class="assets">
      <div class="title">{{ t_('AssetList') }}</div>
      <template v-for="asset in assets">
        <nuxt-link
          :key="asset.symbol"
          :to="{ path: '/asset', query: { name: asset.symbol } }"
        >
          <div class="asset">
            <imgs class="icon" :src="asset.icon" />
            <div class="info">
              <div class="symbol">{{ asset.symbol }}</div>
              <div class="name">{{ asset.name }}</div>
            </div>
            <div class="balance">{{ balance(asset) }}</div>
          </div>
        </nuxt-link>
      </template>
    </div>
    <Qrcode :show.sync="showQRCode" :address="address" />
  </div>
</template>
<script>
import Qrcode from '~/components/qrcode.vue'
export default {
  components: { Qrcode },
  data() {
    return {
      showQRCode: false,
    }
  },
  computed: {
    address() {
      return this.$store.state.provider.address
    },
    provider() {
      return this.$store.state.provider
    },
    assets() {
      return this.$store.state.assets
    },
  },
  methods: {
    t_(key) {
      return this.$t('index.' + key)
    },
    balance(asset) {
      if (asset.symbol) {
        const balance = asset.sudt ? asset.sudtAmount : asset.capacity
        return balance.toString(asset.decimals, {
          commify: true,
          fixed: asset.decimals >= 4 ? 4 : asset.decimals || undefined,
        })
      }
      return ''
    },
  },
}
</script>
<style lang="stylus">
#page-index {
  .info-card {
    margin-top: 30px;
    display: flex;
    width: 100%;
    min-height: 172px;
    position: relative;
    color: white;

    .bg {
      width: 100%;
    }

    .top {
      position: absolute;
      top: 24px;
      left: 18px;
      right: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .left {
        .welcome {
          font-size: 20px;
          font-weight: 600;
          color: #FFFFFF;
        }

        .email {
          font-size: 18px;
          margin-top: 8px;
        }
      }

      .right {
        .avatar {
          width: 56px;
          height: 56px;
          border: 2px solid #E9F0FF;
          border-radius: 50%;
        }
      }
    }

    .bottom {
      cursor: pointer;
      position: absolute;
      bottom: 18px;
      left: 18px;

      .qrcode {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        box-shadow: 0 2px 7px 1px rgba(28, 123, 255, 0.39);
      }
    }
  }

  .assets {
    margin-top: 30px;
    margin-bottom: 30px;
    width: 100%;
    font-weight: bold;
    color: #333333;

    .asset {
      border-radius: 14px;
      margin-top: 18px;
      background: white;
      height: 94px;
      background: #FFFFFF;
      color: #333333;
      padding: 0 12px;
      display: flex;
      align-items: center;
      box-shadow: 0 3px 10px 8px rgba(233, 240, 255, 0.2);

      .icon {
        border-radius: 10px;
        border: 1px solid #E9F0FF;
        width: 42px;
        height: 42px;
      }

      .info {
        margin-left: 10px;

        .symbol {
          font-size: 14px;
        }

        .name {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 600;
          color: #B8B8B8;
        }
      }

      .balance {
        font-size: 14px;
        margin-left: auto;
      }
    }
  }
}
</style>
