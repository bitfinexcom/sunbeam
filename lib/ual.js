'use strict'

class SunbeamUAL {
  constructor (opts) {
    this.opts = Object.assign({
      appName: 'Eosfinex-UAL',
      connected: false
    }, opts)
console.log(this.opts)
    this.account = null
    this.user = this.opts.user
    this.connected = this.opts.connected
    this.instance = this.opts.UAL
  }

  async auth (client, opts) {
    if (!this.account) {
      const accountName = await this.user.getAccountName()

      const { network } = opts
//      const { account, signProvider } = await this.loginScatter(network)
//      client.api.signatureProvider = signProvider

      const permission = 'active'
      this.account = {
        authorization: {
          authorization: accountName + '@' + permission
        },
        account: accountName,
        permission
      }
    }

    return this.account
  }
/*
  async loginScatter (network) {
    const ual = this.instance

    console.log('ual', ual)

    await scatter.getIdentity({ accounts: [network] })
    const account = scatter.identity.accounts.find(x => x.blockchain === 'eos')
    const signProvider = scatter.eosHook(network, null, true)

    return { account, signProvider }
  }
*/
  
  async logoutScatter () {
    await this.scatterInstance.forgetIdentity()
  }
}

module.exports = SunbeamUAL
