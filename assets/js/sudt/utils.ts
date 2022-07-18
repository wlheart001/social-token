import PWCore, { Amount } from '@lay2/pw-core'

export async function getCkbBalance() {
  if (PWCore.defaultCollector) {
    const balance = await PWCore.defaultCollector.getBalance(
      PWCore.provider.address,
    )
    console.log('ckb balance = ', balance)
    return balance
  }
}

export async function isCkbEnough(minCkb: Amount) {
  const ckbBalance = await getCkbBalance()
  if (ckbBalance) {
    return ckbBalance.gt(minCkb)
  }
}
