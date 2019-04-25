'use strict'

const MB = require('mandelbrot')

const Order = require('./order.js')
const Wallet = MB.BaseWallet
const Orderbook = MB.R0Orderbook

const Sunbeam = require('./sunbeam-ws.js')
module.exports = (exports = Sunbeam)

const Orders = require('./managed-orders.js')

const SignHelper = require('./order-sign.js')
const SunbeamScatter = require('./scatter.js')
const { decimalPad } = require('./util.js')

const Cbq = require('cbq')
const fetch = require('node-fetch')

const tokenContract = 'eosio.token'
const exchangeContract = 'efinexchange'

let URL = require('url').URL
if (typeof window !== 'undefined') {
  URL = window.URL
}

class MandelbrotEosfinex extends MB.WsBase {
  constructor (client, opts = {
    transform: {},
    url: null,
    Wallet: Wallet,
    Orderbook: Orderbook,
    Orders: Orders
  }) {
    // FIXME: simplify defaults
    const Ob = opts.Orderbook || Orderbook
    if (!opts.Orderbook) opts.Orderbook = Ob
    const Or = opts.Orders || Orders
    if (!opts.Orders) opts.Orders = Or
    const W = opts.Wallet || Wallet
    if (!opts.Wallet) opts.Wallet = W
    opts.requestTimeout = opts.requestTimeout || 10000

    super(opts)

    if (!opts.eos.tokenContract) opts.eos.tokenContract = tokenContract
    if (!opts.eos.exchangeContract) opts.eos.exchangeContract = exchangeContract

    this.scatter = null
    if (opts.eos.auth.scatter) {
      this.scatter = new SunbeamScatter({
        appName: opts.eos.auth.scatter.appName,
        ScatterJS: opts.eos.auth.scatter.ScatterJS
      })
    }

    this.client = client
    this.signer = new SignHelper(this.client, opts)

    this.account = null
    this.chainId = null

    this.cbq = new Cbq()
  }

  auth (opts) {
    return new Promise(async (resolve, reject) => {
      try {
        const auth = await this.getAuth()
        const signed = await this.getTestTx()

        const { account } = auth

        const payload = {
          event: 'auth',
          account: account,
          meta: signed
        }

        this.send(payload)

        resolve(auth)
      } catch (e) {
        reject(e)
      }
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
      const { requestTimeout } = this.conf
      const reqId = Math.floor(Math.random() * 10E+15)

      this.sendReqRes({
        reqId: reqId,
        requestTimeout,
        msg: { event: 'chain' },
        ns: 'ci'
      }, (err, res) => {
        if (err) return reject(err)

        resolve(res)
      })
    })
  }

  handleInfoMessage (m) {
    super.handleInfoMessage(m)

    const [, id, data] = m

    if (id === 'ci') {
      this.emit('ci', data)
    }

    if (id === 'ct') {
      const id = m[2]
      this.emit('ct-' + id, m)
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
      }).catch(reject)
    })
  }

  async getNetwork () {
    const chainId = await this.getChainId()
    const { httpEndpoint } = this.conf.eos
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

  getAuth (cached) {
    return new Promise((resolve, reject) => {
      if (this.account) {
        resolve(this.account)
        return
      }

      const { auth } = this.conf.eos
      if (auth.keys) {
        const res = {
          authorization: { authorization: auth.keys.account + '@' + auth.keys.permission },
          account: auth.keys.account,
          permission: auth.keys.permission
        }
        this.account = res

        return resolve(res)
      }

      this.getNetwork()
        .then((network) => {
          const opts = { network }

          this.scatter
            .auth(this.client, opts)
            .then((res) => {
              this.account = res

              return resolve(res)
            })
            .catch(reject)
        }).catch(reject)
    })
  }

  cancel (data) {
    return new Promise(async (resolve, reject) => {
      try {
        const { clientId, id, symbol, side } = data
        const { exchangeContract } = this.conf.eos

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
        const signed = await this.signer.signTx(
          args,
          auth,
          'cancel',
          meta,
          exchangeContract
        )

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
        const { exchangeContract } = this.conf.eos

        const o = new Order(order, {})
        o.parse()
        o.maybeSetUser(auth.account)
        const serialized = o.serialize()

        const signed = await this.signer.signTx(
          serialized,
          auth,
          'place',
          meta,
          exchangeContract
        )

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
        const { exchangeContract } = eos

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
        const signed = await this.signer.signTx(
          args,
          auth,
          'withdraw',
          meta,
          exchangeContract
        )

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
        const { currency, to } = data
        const { exchangeContract } = this.conf.eos

        const auth = await this.getAuth()
        const args = {
          symbol: currency.toLowerCase(),
          to: to || auth.account
        }

        const meta = await this.requestChainMeta()
        const signed = await this.signer.signTx(
          args,
          auth,
          'sweep',
          meta,
          exchangeContract
        )

        const payload = [0, 'tx', null, { meta: signed }]
        this.send(payload)
        resolve({ payload, data: args })
      } catch (e) {
        reject(e)
      }
    })
  }

  getTestTx () {
    return new Promise(async (resolve, reject) => {
      try {
        const auth = await this.getAuth()
        const args = {}
        const { exchangeContract } = this.conf.eos

        const meta = await this.requestChainMeta()
        const signed = await this.signer.signTx(
          args,
          auth,
          'validate',
          meta,
          exchangeContract
        )

        resolve(signed)
      } catch (e) {
        reject(e)
      }
    })
  }

  requestHistory (opts = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const { moonbeam } = this.conf

        if (!opts.limit) opts.limit = 50

        const signed = await this.getTestTx()

        const payload = {
          meta: signed,
          limit: opts.limit
        }

        const data = {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' }
        }

        fetch(moonbeam + '/history', data)
          .then(res => res.json())
          .then(json => {
            resolve({ data: payload, res: json })
          })
          .catch(reject)
      } catch (e) {
        reject(e)
      }
    })
  }

  sendReqRes (req, cb) {
    const { reqId, requestTimeout, msg, ns } = req
    let timeout

    const _cb = (msg) => {
      clearTimeout(timeout)
      this.cbq.trigger(reqId, null, msg)
    }

    this.once(ns, _cb)

    timeout = setTimeout(() => {
      this.cbq.trigger(reqId, new Error('ERR_TIMEOUT'))
    }, requestTimeout)

    this.cbq.push(reqId, (err, res) => {
      clearTimeout(timeout)

      if (err) {
        this.removeListener(ns, cb)
        return cb(err)
      }

      cb(null, res)
    })

    this.send(msg)
  }

  verifyTx (meta, uuid, opts) {
    return new Promise(async (resolve, reject) => {
      try {
        const { requestTimeout } = opts

        if (!uuid) throw Error('uuid missing')

        uuid = uuid + ''
        const payload = [0, 'ct', uuid, { meta }]
        const data = {
          reqId: uuid,
          requestTimeout,
          msg: payload,
          ns: 'ct-' + uuid
        }

        this.sendReqRes(data, (err, res) => {
          if (err) return reject(err)
          resolve(res)
        })
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
        const { tokenContract } = eos

        if (amount[0] === '-') {
          throw new Error('amount must be positive')
        }

        const auth = await this.getAuth()

        const amountPad = decimalPad(amount, 8)
        const amountPlusCurrency = `${amountPad} ${currency}`
        const args = {
          from: auth.account,
          to: eos.exchangeContract,
          quantity: amountPlusCurrency,
          memo: '',
          account: eos.tokenContract
        }

        const meta = await this.requestChainMeta()
        const signed = await this.signer.signTx(args, auth, 'transfer', meta, tokenContract)

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
