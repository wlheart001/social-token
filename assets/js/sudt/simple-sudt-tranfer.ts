import PWCore, {
  Address,
  Amount,
  AmountUnit,
  // Builder,
  SUDT,
  transformers,
} from '@lay2/pw-core'
import { getUnipassCellDeps } from '../utils'
import UnipassSigner from '../UnipassSigner'
import {
  SimpleSUDTBuilder,
  SimpleSUDTBuilderOptions,
} from './simple-sudt-builder'
import { UsdtProvider } from './sudt-provider'
import { UnipassIndexerCollector } from './unipass-indexer-collector'

export async function getBalanceEnough() {
  if (PWCore.defaultCollector) {
    const balance = await PWCore.defaultCollector.getBalance(
      PWCore.provider.address,
    )
    console.log('balance=', balance)
    // critical value .add(Builder.MIN_CHANGE) +61
    // 142(sUDT occupied) + 0.6(fee), 0.6 CKB is enough to transfer about 30,000 times
    return balance.gt(new Amount('142.6', AmountUnit.ckb))
  }
}

export async function getSimpleUSDTSignMessage(
  sudtTokenId: string,
  address: Address,
  amount: Amount,
  masterPubkey: string,
) {
  const provider = new UsdtProvider(masterPubkey)

  const cellDeps = await getUnipassCellDeps()
  const lockLen = (1 + (8 + 256 * 2) * 2) * 2
  const collector = new UnipassIndexerCollector(
    process.env.CKB_INDEXER_URL as string,
  )

  const builderOption: SimpleSUDTBuilderOptions = {
    witnessArgs: {
      lock: '0x' + '0'.repeat(lockLen),
      input_type: '',
      output_type: '',
    },
    collector,
    // sender can leave a minimum of 0.1 CKB as a fee
    minimumOutputCellCapacity: new Amount('142.5'),
  }

  const sudt = new SUDT(sudtTokenId)

  const builder = new SimpleSUDTBuilder(
    sudt,
    address,
    amount,
    cellDeps,
    builderOption,
  )
  console.log('builder', builder)
  const tx = await builder.build()
  console.log('tx', tx)
  const signer = new UnipassSigner(provider)
  console.log('signer', signer)
  const messages = signer.toMessages(tx)
  console.log('[getUsdtSignMessage-messages]', messages)
  const txObj = transformers.TransformTransaction(tx)
  const message = messages[0].message
  return { tx, txObj, message }
}
