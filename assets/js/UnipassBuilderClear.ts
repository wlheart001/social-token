import PWCore, {
  Address,
  Cell,
  RawTransaction,
  Transaction,
  Builder,
  Collector,
} from '@lay2/pw-core'
import { getUnipassCellDeps } from './utils'

const UnipassWitnessArgs = {
  lock: '0x' + '0'.repeat(2082),
  input_type: '',
  output_type: '',
}

export default class UnipassBuilderClear extends Builder {
  constructor(
    private address: Address,
    feeRate?: number,
    collector?: Collector,
  ) {
    super(feeRate, collector)
  }

  async build(): Promise<Transaction> {
    const balance = await PWCore.defaultCollector.getBalance(
      PWCore.provider.address,
    )
    const outputCell = new Cell(balance, this.address.toLockScript())
    const inputCells = await PWCore.defaultCollector.collect(
      PWCore.provider.address,
      { neededAmount: outputCell.capacity },
    )
    const cellsDeps = await getUnipassCellDeps()
    const tx = new Transaction(
      new RawTransaction(inputCells, [outputCell], cellsDeps),
      [UnipassWitnessArgs],
    )

    this.fee = Builder.calcFee(tx)
    if (balance.lt(this.fee.add(Builder.MIN_CHANGE))) {
      throw new Error('Capacity is too small to send.')
    }
    tx.raw.outputs[0].capacity = outputCell.capacity.sub(this.fee)
    return tx
  }
}
