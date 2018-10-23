'use strict'

const MB = require('mandelbrot').WsBase

const Order = require('./order.js')
const Wallet = require('./managed-wallet.js')
const Orderbook = require('./managed-ob.js')
const Orders = require('./managed-orders.js')

const SignHelper = require('./order-sign.js')
const Cbq = require('cbq')

let URL
if (typeof window === 'undefined') {
  URL = require('url').URL
}

class MandelbrotEosfinex extends MB {
  constructor (opts = {
    transform: {},
    url: null,
    Wallet: Wallet,
    Orderbook: Orderbook,
    Orders: Orders
  }) {
    if (!opts.eos.permission) {
      opts.eos.permission = '@active'
    }

    // FIXME: simplify defaults
    const Ob = opts.Orderbook || Orderbook
    if (!opts.Orderbook) opts.Orderbook = Ob
    const Or = opts.Orders || Orders
    if (!opts.Orders) opts.Orders = Or
    const W = opts.Wallet || Wallet
    if (!opts.Wallet) opts.Wallet = W
    opts.requestTimeout = opts.requestTimeout || 10000

    super(opts)

    if (opts.eos.Eos) this.signer = new SignHelper(opts)
    this.account = null
    this.chainId = null

    this.cbq = new Cbq()
  }

  auth (opts) {
    return this.getAuth()
      .then((auth) => {
        const { account } = auth

        const payload = { event: 'auth', account: account }
        this.send(payload)

        return auth
      })
  }

  subscribePublicTrades (symbol) {
    this.send({
      event: 'subscribe',
      channel: 'trades',
      symbol: symbol
    })
  }

  subscribeWallet () {
    return this.getAuth()
      .then((auth) => {
        const { account } = auth

        this.send({
          event: 'subscribe',
          channel: 'wallets',
          account: account
        })
      })
  }

  requestChainMeta () {
    return new Promise((resolve, reject) => {
      const limit = this.conf.requestTimeout
      const reqId = Math.floor(Math.random() * 10E+15)
      let timeout

      const cb = (msg) => {
        clearTimeout(timeout)
        this.cbq.trigger(reqId, null, msg)

        resolve(msg)
      }
      this.once('ci', cb)

      timeout = setTimeout(() => {
        this.cbq.trigger(reqId, new Error('ERR_TIMEOUT'))
      }, limit)

      this.cbq.push(reqId, (err, res) => {
        clearTimeout(timeout)

        if (err) {
          this.removeListener('ci', cb)
          return reject(err)
        }

        resolve(res)
      })

      this.send({
        event: 'chain'
      })
    })
  }

  handleInfoMessage (m) {
    super.handleInfoMessage(m)

    const [, id, data] = m

    if (id === 'ci') {
      this.emit('ci', data)
    }
  }

  unSubscribeWallet () {
    const { account } = this.conf.eos
    this.unsubscribe('wallets', { account })
  }

  unSubscribeOrders () {
    this.unsubscribe('reports')
  }

  getScope (symbol, side) {
    // eth.btc.a

    const s = side === 'ask' ? 'a' : 'b'
    return symbol.toLowerCase() + '.' + s
  }

  getChainId () {
    return new Promise((resolve, reject) => {
      if (this.chainId) return resolve(this.chainId)

      this.requestChainMeta().then((meta) => {
        const [ , , chainId ] = meta

        this.chainId = chainId
        resolve(this.chainId)
      })
    })
  }

  setupScatter () {
    return new Promise((resolve, reject) => {
      if (this.scatterConnected) return resolve()


      const { auth } = this.conf.eos
      const appName = auth.scatter.appName

      const scatter = this.getScatterInstance()
      scatter.connect(appName).then(connected => {
        if (!connected) return reject(new Error('scatter not running.'))

        this.scatterConnected = true
        resolve()
      })
    })
  }

  getScatterInstance () {
    const { auth } = this.conf.eos
    return auth.scatter.ScatterJS.scatter
  }

  loginScatter () {
    return new Promise(async (resolve, reject) => {
      const scatter = this.getScatterInstance()

      try {
        const chainId = await this.getChainId()
        const { httpEndpoint } = this.conf.eos
        const parsed = new URL(httpEndpoint)

        const network = {
          blockchain: 'eos',
          protocol: parsed.protocol.replace(':', ''),
          host: parsed.hostname,
          port: parsed.port,
          chainId: chainId
        }

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

  getAuth (cached) {
    return new Promise((resolve, reject) => {
      if (this.account) {
        resolve(this.account)
        return
      }

      const { auth } = this.conf.eos

      if (auth.keys) {
        const res = {
          authorization: { authorization: auth.keys.account + auth.keys.permission },
          account: auth.keys.account
        }

        this.account = res

        return resolve(res)
      }

      this.setupScatter()
        .then(() => { return this.loginScatter() })
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

  cancel (data) {
    return new Promise(async (resolve, reject) => {
      try {
        const { clientId, id, symbol, side } = data

        const auth = await this.getAuth()

        const scope = this.getScope(symbol, side)
        const args = {
          scope: scope,
          account: auth.account
        }

        if (clientId) {
          args.clId = clientId
        }

        if (!args.clId) {
          args.clId = 0
        }

        if (id) {
          args.id = id
        }

        const meta = await this.requestChainMeta()
        const signed = await this.signer.signTx(args, auth, 'cancel', meta)

        const payload = [0, 'oc', null, { meta: signed }]
        this.send(payload)
        resolve({ payload, data: args })
      } catch (e) {
        reject(e)
      }
    })
  }

  place (order) {
    return new Promise(async (resolve, reject) => {
      try {
        const auth = await this.getAuth()
        const meta = await this.requestChainMeta()

        const o = new Order(order, {})
        o.parse()
        o.maybeSetUser(auth.account)
        const serialized = o.serialize()

        const signed = await this.signer.signTx(serialized, auth, 'place', meta)

        const payload = [0, 'on', null, { meta: signed }]
        this.send(payload)
        resolve({ payload, data: o.parsed })
      } catch (e) {
        reject(e)
      }
    })
  }

  withdraw (data) {
    return new Promise(async (resolve, reject) => {
      try {
        const { eos } = this.conf

        const { to, currency, amount } = data

        if (amount[0] === '-') {
          throw new Error('amount must be positive')
        }

        const amountPad = eos.Eos.modules.format.DecimalPad(amount, 8)
        const amountPlusCurrency = `${amountPad} ${currency}`

        const auth = await this.getAuth()
        const args = {
          amount: amountPlusCurrency,
          to: to || auth.account
        }

        const meta = await this.requestChainMeta()
        const signed = await this.signer.signTx(args, auth, 'withdraw', meta)

        const payload = [0, 'tx', null, { meta: signed }]
        this.send(payload)
        resolve({ payload, data: args })
      } catch (e) {
        reject(e)
      }
    })
  }

  sweep (data) {
    return new Promise(async (resolve, reject) => {
      try {
        const { eos } = this.conf
        const { currency, to } = data

        const auth = await this.getAuth()
        const args = {
          symbol: currency.toLowerCase(),
          to: to || auth.account
        }

        const meta = await this.requestChainMeta()
        const signed = await this.signer.signTx(args, auth, 'sweep', meta)

        const payload = [0, 'tx', null, { meta: signed }]
        this.send(payload)
        resolve({ payload, data: args })
      } catch (e) {
        reject(e)
      }
    })
  }

  deposit (data) {
    return new Promise(async (resolve, reject) => {
      try {
        const { eos } = this.conf
        const { currency, amount } = data

        if (amount[0] === '-') {
          throw new Error('amount must be positive')
        }

        const auth = await this.getAuth()

        const amountPad = eos.Eos.modules.format.DecimalPad(amount, 8)
        const amountPlusCurrency = `${amountPad} ${currency}`

        const args = {
          from: auth.account,
          to: 'efinexchange',
          quantity: amountPlusCurrency,
          memo: '',
          account: 'efinextether'
        }

        const meta = await this.requestChainMeta()
        const signed = await this.signer.signDeposit(args, auth, meta)

        const payload = [0, 'tx', null, { meta: signed }]
        this.send(payload)
        resolve({ payload, data: args })
      } catch (e) {
        reject(e)
      }
    })
  }
}

module.exports = MandelbrotEosfinex
