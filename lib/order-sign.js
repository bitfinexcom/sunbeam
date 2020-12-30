'use strict'

const { reverseHex } = require('./util')

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

  async getTxHeader ({ expireInSeconds = 86400, expireAt = null } = {}) {
    const { last_irreversible_block_num: libn, last_irreversible_block_id: libi } = await this.client.rpc.get_info()
    const prefix = parseInt(reverseHex(libi.substr(16, 8)), 16)
    const expirationDate = expireAt || new Date(Date.now() + expireInSeconds * 1000)

    return {
      expiration: expirationDate.toISOString().split('.')[0],
      ref_block_num: libn & 0xffff,
      ref_block_prefix: prefix
    }
  }

  async signTx (payload, auth, action, contract, txOpts = {}) {
    const { account, permission, addAuth } = auth
    const authorization = [{ actor: account, permission: permission }]

    if (addAuth && addAuth.account && addAuth.permission) {
      authorization.push({ actor: addAuth.account, permission: addAuth.permission })
    }

    const txHeader = await this.getTxHeader(txOpts)

    const txData = {
      ...txHeader,
      actions: [{
        account: contract,
        name: action,
        authorization,
        data: payload
      }]
    }

    const opts = { broadcast: txOpts.broadcast || false }

    if (this.client.ual) {
      const res = await this.client.ual.signTransaction(txData, opts)
      return this.fixTx(res.transaction)
    }

    const res = await this.client.api.transact(txData, opts)
    return this.fixTx(res)
  }
}

module.exports = SignHelper
