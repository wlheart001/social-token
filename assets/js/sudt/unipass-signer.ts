import { Signer, Provider, Blake2bHasher, Message } from '@lay2/pw-core'

export class UnipassSigner extends Signer {
  constructor(readonly providers: Provider[]) {
    super(new Blake2bHasher())
  }

  async signMessages(messages: Message[]) {
    const sigs = []

    for (const message of messages) {
      let matched = false
      for (const provider of this.providers) {
        // console.log(
        //   'message',
        //   provider.address.toLockScript(),
        //   message.lock,
        //   provider.address.toLockScript().toHash() === message.lock.toHash(),
        // )
        if (
          provider.address.toLockScript().toHash() === message.lock.toHash()
        ) {
          sigs.push(await provider.sign(message.message))

          matched = true
          break
        }
      }

      if (!matched) {
        sigs.push('0x')
      }
    }
    return sigs
  }
}
