import PWCore, {
  Address,
  Amount,
  Builder,
  SUDT,
  Transaction,
  RawTransaction,
  BuilderOption,
  SUDTCollector,
  AmountUnit,
  Cell,
  CellDep,
  cellOccupiedBytes,
  transformers,
} from '@lay2/pw-core'
import { getUnipassCellDeps } from '../utils'
import UnipassSigner from '../UnipassSigner'
import { UsdtProvider } from './sudt-provider'
import { UnipassIndexerCollector } from './unipass-indexer-collector'
import { getCkbBalance, getSudtCapapcity } from './utils'

const maxOutputCellCapacity = new Amount('1000', AmountUnit.ckb)
const minDepositLockCellCkb = new Amount('379', AmountUnit.ckb)
export const minCkbToDeposit = new Amount('379.5', AmountUnit.ckb)
const minChangeCellCkb = new Amount('61', AmountUnit.ckb)

export async function isCkbEnough(minCkb: Amount, sudtTokenId: string, sudtAmount: Amount) {
  const ckbBalance = await getCkbBalance()
  const sudtCapacity = await getSudtCapapcity(sudtTokenId, sudtAmount)
  const allCkb = ckbBalance.add(sudtCapacity)
  return allCkb.gte(minCkb)
}

export async function buildDepositSudtSignMessage(
  sudtTokenId: string,
  toAddress: Address,
  amount: Amount,
  masterPubkey: string,
) {
  const provider = new UsdtProvider(masterPubkey)

  const cellDeps = await getUnipassCellDeps()
  const lockLen = (1 + (8 + 256 * 2) * 2) * 2
  const collector = new UnipassIndexerCollector(
    process.env.CKB_INDEXER_URL as string,
  )

  const builderOption: DepositSudtBuilderOptions = {
    witnessArgs: {
      lock: '0x' + '0'.repeat(lockLen),
      input_type: '',
      output_type: '',
    },
    collector,
    minimumOutputCellCapacity: new Amount(minDepositLockCellCkb.toString()),
    autoCalculateCapacity: true
  }
  const sudt = new SUDT(sudtTokenId)
  const builder = new DepositSudtBuilder(
    sudt,
    toAddress,
    amount,
    cellDeps,
    builderOption,
  )
  const tx = await builder.build()
  console.log('tx: ' + tx)
  const signer = new UnipassSigner(provider)
  const messages = signer.toMessages(tx)
  const txObj = transformers.TransformTransaction(tx)
  const message = messages[0].message
  console.log('message: ' + message)
  return { tx, txObj, message }
}

export interface DepositSudtBuilderOptions extends BuilderOption {
  autoCalculateCapacity?: boolean
  minimumOutputCellCapacity?: Amount
  maximumOutputCellCapacity?: Amount
}

export class DepositSudtBuilder extends Builder {
  fee: Amount

  inputCells: Cell[] = []
  outputCells: Cell[] = []

  protected autoCalculateCapacity = false
  protected minimumOutputCellCapacity = minDepositLockCellCkb
  protected maximumOutputCellCapacity = maxOutputCellCapacity

  constructor(
    private sudt: SUDT,
    private address: Address,
    private amount: Amount,
    private cellDeps: CellDep[],
    protected options: DepositSudtBuilderOptions = {},
  ) {
    super(options.feeRate, options.collector, options.witnessArgs)
    this.fee = new Amount('0')

    if (typeof options.autoCalculateCapacity === 'boolean') {
      this.autoCalculateCapacity = options.autoCalculateCapacity
    }

    if (typeof options.minimumOutputCellCapacity !== 'undefined') {
      this.minimumOutputCellCapacity = options.minimumOutputCellCapacity
    }

    if (typeof options.maximumOutputCellCapacity !== 'undefined') {
      this.maximumOutputCellCapacity = options.maximumOutputCellCapacity
    }
  }

  async build(): Promise<Transaction> {
    if (!(this.collector instanceof SUDTCollector)) {
      throw new TypeError('this.collector is not a SUDTCollector instance')
    }

    const unspentSUDTCells = await this.collector.collectSUDT(
      this.sudt,
      PWCore.provider.address,
      { neededAmount: this.amount },
    )

    let inputsSudtSum = new Amount('0')
    let inputsCkbSum = new Amount('0')

    for (const inputCell of unspentSUDTCells) {
      inputsSudtSum = inputsSudtSum.add(inputCell.getSUDTAmount())
      inputsCkbSum = inputsCkbSum.add(inputCell.capacity)
      this.inputCells.push(inputCell)
    }

    const receiverOutputCell = new Cell(
      this.calcReceiverCellCapacity(),
      this.address.toLockScript(),
      this.sudt.toTypeScript(),
      undefined,
      inputsSudtSum.toUInt128LE(),
    )
    this.outputCells.push(receiverOutputCell)

    if (inputsCkbSum.lt(minCkbToDeposit)) {
      await this.supplyCkb(minCkbToDeposit.sub(inputsCkbSum))
    }

    return this.payFee()
  }

  private calcReceiverCellCapacity() {
    let receiverCellCapacity = new Amount('0')

    if (this.autoCalculateCapacity) {
      const receiverOutputCell = {
        lock: this.address.toLockScript(),
        type: this.sudt.toTypeScript(),
        data: new Amount('0').toUInt128LE(),
      }
      receiverCellCapacity = new Amount(
        cellOccupiedBytes(receiverOutputCell).toString(),
        AmountUnit.ckb,
      )
    }

    if (
      this.minimumOutputCellCapacity &&
      receiverCellCapacity.lt(this.minimumOutputCellCapacity)
    ) {
      receiverCellCapacity = this.minimumOutputCellCapacity
    }

    if (
      this.maximumOutputCellCapacity &&
      receiverCellCapacity.gt(this.maximumOutputCellCapacity)
    ) {
      receiverCellCapacity = this.maximumOutputCellCapacity
    }

    return receiverCellCapacity
  }

  /**
   * Fetch pure CKB cells to fulfill the need CKB amount
   * @param neededAmount  needed CKB amount
   */
  private async supplyCkb(neededCkbAmount: Amount) {
    const unspentCKBCells = await this.collector.collect(
      PWCore.provider.address,
      { neededAmount: neededCkbAmount },
    )

    if (!unspentCKBCells || unspentCKBCells.length === 0) {
      throw new Error('no avaiable CKB')
    }

    let fetchedCkbSum = new Amount('0')

    for (const ckbCell of unspentCKBCells) {
      this.inputCells.push(ckbCell)
      fetchedCkbSum = fetchedCkbSum.add(ckbCell.capacity)

      if (fetchedCkbSum.gt(neededCkbAmount)) break
    }

    if (fetchedCkbSum.lt(neededCkbAmount)) {
      throw new Error('CKB is insufficient')
    }

    if (fetchedCkbSum.gt(neededCkbAmount)) {
      const diff = fetchedCkbSum.sub(neededCkbAmount)
      if (diff.lt(minChangeCellCkb)) {
        this.outputCells[0].capacity.add(diff)
      } else {
        const cell = new Cell(diff, PWCore.provider.address.toLockScript())
        this.outputCells.push(cell)
      }
    }
  }

  private payFee(): Transaction {
    this.rectifyTx()

    let inputsCkbSum = new Amount('0')
    for (const inputCell of this.inputCells) {
      inputsCkbSum = inputsCkbSum.add(inputCell.capacity)
    }

    let outputsCkbSum = new Amount('0')
    for (const outputCell of this.outputCells) {
      outputsCkbSum = outputsCkbSum.add(outputCell.capacity)
    }

    const diff = inputsCkbSum.sub(outputsCkbSum).sub(this.fee)

    if (this.outputCells.length > 1) {
      this.outputCells[1].capacity = this.outputCells[1].capacity.add(diff)
    } else {
      this.outputCells[0].capacity = this.outputCells[0].capacity.add(diff)
    }

    return this.rectifyTx()
  }

  /**
   * build tx based on inputs and outputs, and calculate the tx fee
   */
   private rectifyTx() {
    const sudtCellDeps = [
      PWCore.config.defaultLock.cellDep,
      PWCore.config.pwLock.cellDep,
      PWCore.config.sudtType.cellDep,
    ].concat(this.cellDeps)

    const tx = new Transaction(
      new RawTransaction(this.inputCells, this.outputCells, sudtCellDeps),
      [this.witnessArgs],
    )

    this.fee = Builder.calcFee(tx, this.feeRate)
    return tx
  }

  getCollector() {
    return this.collector
  }
}
