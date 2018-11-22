'use strict'

let URL = require('url').URL
if (typeof window !== 'undefined') {
  URL = window.URL
}

class SunbeamScatter {
  constructor (opts) {
    this.opts = Object.assign({
      appName: 'Eosfinex-Scatter'
    }, opts)

    this.scatterConnected = false
    this.account = null
  }

  auth (opts) {
    return new Promise((resolve, reject) => {
      if (this.account) return resolve(this.account)

      this.setupScatter()
        .then(() => { return this.loginScatter(opts) })
        .then((account) => {
          const res = {
            authorization: {
              authorization: account.name + '@' + account.authority
            },
            account: account.name
          }

          this.account = res

          return resolve(res)
        }).catch(reject)
    })
  }

  getScatterInstance () {
    const { ScatterJS } = this.opts
    return ScatterJS.scatter
  }

  setupScatter () {
    return new Promise((resolve, reject) => {
      if (this.scatterConnected) return resolve()

      const { appName } = this.opts
      const scatter = this.getScatterInstance()
      scatter.connect(appName).then(connected => {
        if (!connected) return reject(new Error('scatter not running.'))

        this.scatterConnected = true
        resolve()
      })
    })
  }

  getNetwork (opts) {
    const { httpEndpoint, chainId } = opts
    const parsed = new URL(httpEndpoint)

    // if the port is not explicitly set in the given endpoint,
    // set it based on the protocol
    const protocol = parsed.protocol.replace(':', '')
    const port = parsed.port
      ? parsed.port
      : (protocol === 'https') ? 443 : 80

    const network = {
      blockchain: 'eos',
      protocol,
      host: parsed.hostname,
      port,
      chainId: chainId
    }

    return network
  }

  getSignProvider () {
    const scatter = this.getScatterInstance()
    return scatter.eosHook(this.network)
  }

  async loginScatter (opts) {
    return new Promise(async (resolve, reject) => {
      try {
        if (this.network) return this.network

        const network = this.network = this.getNetwork(opts)

        const scatter = this.getScatterInstance()
        await scatter.suggestNetwork(network)
        await scatter.getIdentity({ accounts: [network] })
        const account = scatter.identity.accounts.find(x => x.blockchain === 'eos')

        resolve(account)
      } catch (e) {
        reject(e)
      }
    })
  }

  logoutScatter () {
    return new Promise((resolve, reject) => {
      const scatter = this.getScatterInstance()
      scatter.forgetIdentity()
      resolve()
    })
  }
}

module.exports = SunbeamScatter
