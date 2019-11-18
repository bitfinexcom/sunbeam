'use strict'

// this is a helper class for signing transactions
// needs http to get contract abis from an eos node.

class SignHelper {
  constructor (client, opts) {
    this.client = client
    this.conf = opts

    this.checkAuthOptions()
  }

  checkAuthOptions (eos) {
    const { auth } = this.conf.eos

    if (auth.scatter && auth.keys) {
      throw new Error(
        'auth must be scatter or keys based, not both. check auth options.'
      )
    }
  }

  getTxHeaders (meta, opts) {
    const { expireInSeconds } = opts

    const [
      headBlockTime,
      lastIrreversibleBlockNumber,
      chainId,
      refBlockPrefix
    ] = meta

    let expiration = new Date(+headBlockTime * 1000 + (expireInSeconds * 1000))
    expiration = expiration.toISOString().split('.')[0]

    const transactionHeaders = {
      expiration,
      ref_block_num: lastIrreversibleBlockNumber & 0xFFFF,
      ref_block_prefix: +refBlockPrefix
    }

    return [transactionHeaders, chainId]
  }

  fixTx (transfer) {
    const fixed = this.client.api.deserializeTransaction(transfer.serializedTransaction)
    fixed.signatures = transfer.signatures

    return fixed
  }

  async signTx (payload, auth, action, meta, contract, returnOriginal) {
    const { expireInSeconds } = this.conf.eos

    const opts = {
      broadcast: false,
      blocksBehind: 3,
      expireSeconds: expireInSeconds
    }

    const [transactionHeaders] = this.getTxHeaders(meta, { expireInSeconds })

    const txdata = {
      expiration: transactionHeaders.expiration,
      ref_block_num: transactionHeaders.ref_block_num,
      ref_block_prefix: transactionHeaders.ref_block_prefix,
      actions: [{
        account: contract,
        name: action,
        authorization: [{
          actor: auth.account,
          permission: auth.permission
        }],
        data: payload
      }]
    }

    const original = await this.client.api.transact(txdata, opts)

    if (returnOriginal) {
      return original
    }

    const des = this.fixTx(returnOriginal)

    return des
  }
}

module.exports = SignHelper
