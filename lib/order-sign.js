'use strict'

// this is a helper class for signing transactions
// needs http to get contract abis from an eos node.

class SignHelper {
  constructor (client, opts) {
    this.client = client
    this.conf = opts
  }

  fixTx (transfer) {
    const fixed = this.client.api.deserializeTransaction(transfer.serializedTransaction)
    fixed.signatures = transfer.signatures

    return fixed
  }

  getSignTxOpts ({ broadcast = false, expireInSeconds = this.conf.eos.expireInSeconds, blocksBehind = 3 } = {}) {
    return {
      broadcast,
      blocksBehind,
      expireSeconds: expireInSeconds
    }
  }

  async signTx (payload, auth, action, meta, contract, txOpts = {}) {
    const { account, permission, addAuth } = auth
    const authorization = [{ actor: account, permission: permission }]

    if (addAuth && addAuth.account && addAuth.permission) {
      authorization.push({ actor: addAuth.account, permission: addAuth.permission })
    }

    const txData = {
      actions: [{
        account: contract,
        name: action,
        authorization,
        data: payload
      }]
    }

    const opts = this.getSignTxOpts(txOpts)

    if (txOpts.expireAt) {
      const [headBlockTime] = meta
      opts.expireSeconds = Math.round(txOpts.expireAt.getTime() / 1000) - headBlockTime
      opts.blocksBehind = 0
    }

    if (this.client.ual) {
      const res = await this.client.ual.signTransaction(txData, opts)
      return this.fixTx(res.transaction)
    }

    const res = await this.client.api.transact(txData, opts)
    return this.fixTx(res)
  }
}

module.exports = SignHelper
