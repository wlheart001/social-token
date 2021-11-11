import { Provider, Platform, AddressType, Address } from '@lay2/pw-core'
import { getAddress } from '../utils'

export class UsdtProvider extends Provider {
  constructor(private readonly masterPubkey: string) {
    super(Platform.ckb)
    const addressStr = getAddress(this.masterPubkey)
    // console.log('this.masterPubkey', this.masterPubkey)
    this.address = new Address(addressStr, AddressType.ckb)
  }

  // eslint-disable-next-line
  async init(): Promise<UsdtProvider> {
    return new Promise((resolve) => {
      resolve(this)
    })
  }

  sign(message: string): Promise<string> {
    console.log('[UnipassProvider] message to sign', message)
    return new Promise((resolve) => resolve(''))
  }

  close() {
    console.log('do nothing')
  }
}
