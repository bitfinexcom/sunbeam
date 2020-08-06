const { UALErrorType, User } = require('universal-authenticator-library')
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')
const { Api } = require('eosjs')
const { TextDecoder, TextEncoder } = require('util')
const PrivateKeyError = require('./PrivateKeyError')

class PrivateKeyUser extends User {
  constructor (rpc, accountName, privateKey) {
    super()

    this.accountName = accountName
    this.privateKey = privateKey
    this.rpc = rpc
  }

  getName () {
    return 'private_key'
  }

  getEos () {
    const signatureProvider = new JsSignatureProvider([this.privateKey])

    const eosOptions = {
      rpc: this.rpc,
      textDecoder: new TextDecoder(),
      textEncoder: new TextEncoder(),
      signatureProvider,
      authorityProvider: {
        getRequiredKeys: () => signatureProvider.getAvailableKeys()
      }
    }

    const eos = new Api(eosOptions)
    return eos
  }

  async signTransaction (
    transaction,
    { broadcast, blocksBehind, expireSeconds }
  ) {
    try {
      const eos = this.getEos()
      const tx = await eos.transact(transaction, {
        broadcast,
        blocksBehind,
        expireSeconds
      })

      return { transaction: tx }
    } catch (e) {
      throw new PrivateKeyError(
        'Unable to sign the given transaction',
        UALErrorType.Signing,
        e
      )
    }
  }

  async getAccountName () {
    return this.accountName
  }

  serializeTransaction (sunbeamValidateTx) {
    const eos = this.getEos()
    const serializedTransaction = eos.serializeTransaction(sunbeamValidateTx)
    return serializedTransaction
  }

  logout () {
    // do nothing
  }
}

module.exports = PrivateKeyUser
