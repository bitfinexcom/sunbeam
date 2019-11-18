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

  auth (client, opts) {
    return new Promise((resolve, reject) => {
      if (this.account) return resolve(this.account)

      const { network } = opts

      this.setupScatter()
        .then(() => { return this.loginScatter(network) })
        .then((data) => {
          const { account, signProvider } = data

          const res = {
            authorization: {
              authorization: account.name + '@' + account.authority
            },
            account: account.name,
            permission: account.authority
          }

          client.api.signatureProvider = signProvider

          this.account = res

          return resolve(res)
        }).catch(reject)
    })
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
