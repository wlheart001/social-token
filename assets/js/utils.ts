import { CellDep } from '@lay2/pw-core'
import axios from 'axios'
import {
  AddressPrefix,
  AddressType,
  fullPayloadToAddress,
} from '@nervosnetwork/ckb-sdk-utils'
const blake2b = require('blake2b')
const buf2hex = function (buffer: ArrayBufferLike) {
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
}
interface CellDepApi {
  data: CellDep[]
  code: number
}
export class CKBHasher {
  hasher: any
  constructor() {
    this.hasher = blake2b(
      32,
      null,
      null,
      new TextEncoder().encode('ckb-default-hash'),
    )
  }

  update(data: any) {
    let dataArray

    if (data instanceof Uint8Array) {
      dataArray = data
    } else {
      dataArray = new TextEncoder().encode(data)
    }
    this.hasher.update(dataArray)
    return this
  }

  digest() {
    const out = new Uint8Array(32)
    this.hasher.digest(out)
    return out.buffer
  }

  digestHex() {
    return `0x${buf2hex(this.digest())}`
  }
}
// export
export const getAddress = (masterKey: string) => {
  const pubKeyArray = Buffer.from(masterKey.replace('0x', ''), 'hex')

  const hashHex = new CKBHasher()
    .update(new Uint8Array(pubKeyArray))
    .digestHex()
    .slice(0, 42)

  const address = fullPayloadToAddress({
    args: hashHex,
    prefix:
      process.env.CKB_CHAIN_ID === '0'
        ? AddressPrefix.Mainnet
        : AddressPrefix.Testnet,
    type: AddressType.TypeCodeHash,
    codeHash: process.env.UNIPASS_TYPE_ID!,
  })

  return address
}

export async function getUnipassCellDeps(): Promise<CellDep[]> {
  const url = (process.env.API_BASE_URL as string) + '/transaction/cellDeps'
  const params = [
    {
      codeHash: process.env.UNIPASS_TYPE_ID,
      hashType: 'type',
      args: '0x',
    },
  ]
  const ret = await axios.post(url, params)
  const data = ret.data as CellDepApi
  return data.data
}
