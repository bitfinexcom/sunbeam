const { User } = require('universal-authenticator-library')
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')
const { Api } = require('eosjs')
const { TextDecoder, TextEncoder } = require('util')

class PrivateKeyUser extends User {
  constructor (rpc, accountName, privateKey) {
    super()

    this.accountName = accountName
    this.privateKey = privateKey
    this.rpc = rpc

    const signatureProvider = new JsSignatureProvider([privateKey])
    const eosOptions = {
      rpc: this.rpc,
      textDecoder: new TextDecoder(),
      textEncoder: new TextEncoder(),
      signatureProvider,
      authorityProvider: {
        getRequiredKeys: () => signatureProvider.getAvailableKeys()
      }
    }
    this.api = new Api(eosOptions)
  }

  async signTransaction (
    transaction,
    { broadcast, blocksBehind, expireSeconds }
  ) {
    const tx = await this.api.transact(transaction, {
      broadcast,
      blocksBehind,
      expireSeconds
    })

    return { transaction: tx }
  }

  async getAccountName () {
    return this.accountName
  }
}

module.exports = PrivateKeyUser
