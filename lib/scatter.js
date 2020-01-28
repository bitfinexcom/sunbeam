'use strict'

class SunbeamScatter {
  constructor (opts) {
    this.opts = Object.assign({
      appName: 'Eosfinex-Scatter',
      connected: false
    }, opts)

    this.account = null
    this.scatterConnected = this.opts.connected
    this.scatterInstance = this.opts.ScatterJS.scatter
  }

  async auth (client, opts) {
    if (!this.account) {
      await this.setupScatter()
      const { network } = opts
      const { account, signProvider } = await this.loginScatter(network)
      client.api.signatureProvider = signProvider

      this.account = {
        authorization: {
          authorization: account.name + '@' + account.authority
        },
        account: account.name,
        permission: account.authority
      }
    }

    return this.account
  }

  async setupScatter () {
    if (this.scatterConnected) return

    const { appName } = this.opts
    const scatter = this.scatterInstance

    const connected = await scatter.connect(appName)
    if (!connected) throw new Error('ERR_SCATTER_NOT_RUNNING')

    await scatter.forgetIdentity()

    this.scatterConnected = true
  }

  async loginScatter (network) {
    const scatter = this.scatterInstance

    await scatter.suggestNetwork(network)

    const hasAccount = await scatter.hasAccountFor(network)
    if (!hasAccount) {
      throw new Error('ERR_NO_SCATTER_ACCOUNT')
    }

    await scatter.getIdentity({ accounts: [network] })
    const account = scatter.identity.accounts.find(x => x.blockchain === 'eos')
    const signProvider = scatter.eosHook(network, null, true)

    return { account, signProvider }
  }

  async logoutScatter () {
    await this.scatterInstance.forgetIdentity()
  }
}

module.exports = SunbeamScatter
