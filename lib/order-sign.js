'use strict'

// this is a helper class for signing transactions
// needs http to get contract abis from an eos node.

class SignHelper {
  constructor (client) {
    this.client = client
    this.expireInSeconds = 24 * 60 * 60
  }

  fixTx (transfer) {
    const fixed = this.client.api.deserializeTransaction(transfer.serializedTransaction)
    fixed.signatures = transfer.signatures

    return fixed
  }

  getSignTxOpts ({
    broadcast = false,
    expireInSeconds = this.expireInSeconds,
    expireAt = null,
    blocksBehind = 3,
    meta
  } = {}) {
    if (expireAt) {
      if (!meta) {
        throw new Error('Meta required')
      }
      const [headBlockTime] = meta
      expireInSeconds = Math.round(expireAt.getTime() / 1000) - headBlockTime
      blocksBehind = 0
    }

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

    const opts = this.getSignTxOpts({ ...txOpts, meta })

    if (this.client.ual) {
      const res = await this.client.ual.signTransaction(txData, opts)
      return this.fixTx(res.transaction)
    }

    const res = await this.client.api.transact(txData, opts)
    return this.fixTx(res)
  }
}

module.exports = SignHelper
