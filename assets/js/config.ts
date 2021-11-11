import { ChainID } from '@lay2/pw-core'
interface Url {
  NODE_URL: string
  INDEXER_URL: string
  CHAIN_ID: ChainID
}

export function getCkbEnv(): Url {
  const data: Url = {
    NODE_URL: process.env.CKB_NODE_URL || '',
    INDEXER_URL: process.env.CKB_INDEXER_URL || '',
    CHAIN_ID:
      process.env.CKB_CHAIN_ID === '0' ? ChainID.ckb : ChainID.ckb_testnet,
  }

  return data
}
