import {
  Address,
  AddressType,
  Blake2bHasher,
  HashType,
  Platform,
  Provider,
  Script,
} from '@lay2/pw-core'

type UP_ACT =
  | 'UP-READY'
  | 'UP-LOGIN'
  | 'UP-SIGN'
  | 'UP-CLOSE'
  | 'UP-BIND'
  | 'UP-RECOVERY'

export interface UnipassAccount {
  pubkey: string
  email: string
  recovery?: boolean
}
export interface UnipassSign {
  pubkey: string
  sign: string
}
export interface UnipassMessage {
  upact: UP_ACT
  payload?: string | UnipassAccount | UnipassSign
}

export default class UnipassProvider extends Provider {
  private _email: string | undefined
  private _recovery: boolean | undefined
  private msgHandler:
    | ((this: Window, event: MessageEvent) => unknown)
    | undefined

  get email() {
    return this._email
  }

  get recovery() {
    return this._recovery
  }

  constructor(email: string, masterPubkey: string) {
    super(Platform.ckb)
    this._email = email

    const addressStr = pubkeyToAddress(masterPubkey)
    this.address = new Address(addressStr, AddressType.ckb)
    // console.log('this.address----', this.address)
  }

  async init(): Promise<UnipassProvider> {
    return new Promise((resolve) => {
      resolve(this)
    })
  }

  async recover(): Promise<UnipassProvider> {
    // console.log('[UnipassProvider] to recover')
    return new Promise((resolve) => resolve(this))
  }

  sign(message: string): Promise<string> {
    // console.log('[UnipassProvider] message to sign', message)
    return new Promise((resolve) => resolve(''))
  }

  close() {
    this.msgHandler && window.removeEventListener('message', this.msgHandler)
  }
}

export function pubkeyToAddress(pubkey: string): string {
  const pubKeyBuffer = Buffer.from(pubkey.replace('0x', ''), 'hex')

  // console.log('pubKeyBuffer', new Uint8Array(pubKeyBuffer))
  const hashHex = new Blake2bHasher()
    .update(pubKeyBuffer.buffer)
    .digest()
    .serializeJson()
    .slice(0, 42)
  const script: Script = new Script(
    process.env.UNIPASS_TYPE_ID as string,
    hashHex,
    HashType.type,
  )

  // console.log('script', script)
  return script.toAddress().toCKBAddress()
}
