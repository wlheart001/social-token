import PWCore, {
  Amount,
  SUDT,
} from '@lay2/pw-core'
import { UnipassIndexerCollector } from './unipass-indexer-collector'

export async function getCkbBalance() {
  if (PWCore.defaultCollector) {
    const balance = await PWCore.defaultCollector.getBalance(
      PWCore.provider.address,
    )
    console.log('ckb balance = ', balance)
    return balance
  }
  return new Amount('0')
}

export async function getSudtCapapcity(sudtTokenId: string, sudtAmount: Amount) {
  const unspentSUDTCells = await collectSudtCells(sudtTokenId, sudtAmount)
  return unspentSUDTCells.reduce((sum, cell) => sum.add(cell.capacity), Amount.ZERO)
}

async function collectSudtCells(sudtTokenId: string, sudtAmount: Amount) {
  const collector = new UnipassIndexerCollector(process.env.CKB_INDEXER_URL as string)
  return await collector.collectSUDT(
    new SUDT(sudtTokenId),
    PWCore.provider.address,
    { neededAmount: sudtAmount },
  )
}
