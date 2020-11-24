'use strict'

// this is a helper class for signing transactions
// needs http to get contract abis from an eos node.

class SignHelper {
  constructor (client, opts) {
    this.client = client
    this.conf = opts
  }

  getTxHeaders (meta, { expireSeconds } = {}) {
    expireSeconds = expireSeconds || this.conf.eos.expireInSeconds

    const [
      headBlockTime,
      lastIrreversibleBlockNumber,
      chainId,
      refBlockPrefix
    ] = meta

    let expiration = new Date(+headBlockTime * 1000 + (expireSeconds * 1000))
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

  getSignTxOpts ({ broadcast = false, expireInSeconds = null, blocksBehind = 3 } = {}) {
    expireInSeconds = expireInSeconds || this.conf.eos.expireInSeconds
    return {
      broadcast,
      blocksBehind,
      expireSeconds: expireInSeconds
    }
  }

  async signTx (payload, auth, action, meta, contract, txOpts = {}) {
    const opts = this.getSignTxOpts(txOpts)
    const [transactionHeaders] = this.getTxHeaders(meta, opts)
    const { account, permission, addAuth } = auth
    const authorization = [{
      actor: account,
      permission: permission
    }]

    if (addAuth && addAuth.account && addAuth.permission) {
      authorization.push({
        actor: addAuth.account,
        permission: addAuth.permission
      })
    }

    const txdata = {
      expiration: transactionHeaders.expiration,
      ref_block_num: transactionHeaders.ref_block_num,
      ref_block_prefix: transactionHeaders.ref_block_prefix,
      actions: [{
        account: contract,
        name: action,
        authorization,
        data: payload
      }]
    }

    if (this.client.ual) {
      const res = await this.client.ual.signTransaction(txdata, opts)
      return this.fixTx(res.transaction)
    }

    const res = await this.client.api.transact(txdata, opts)
    return this.fixTx(res)
  }
}

module.exports = SignHelper
