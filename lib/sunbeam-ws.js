'use strict'

const EventEmitter = require('events')

const WsConnect = require('mandelbrot/lib/ws-connect')
const WsMsgHandler = require('mandelbrot/lib/ws-msg-handler')
const State = require('mandelbrot/lib/state')

const Orders = require('./managed-orders.js')

const MB = require('mandelbrot')
const Wallet = MB.BaseWallet
const Orderbook = MB.R0Orderbook

const Order = require('./order.js')

const SignHelper = require('./order-sign.js')
const SunbeamScatter = require('./scatter.js')
const { decimalPad } = require('./util.js')

const Cbq = require('cbq')

const tokenContract = 'eosio.token'
const exchangeContract = 'efinexchange'

let URL = require('url').URL
if (typeof window !== 'undefined') {
  URL = window.URL
}

const _ = require('lodash')

class MandelbrotEosfinex extends EventEmitter {
  constructor (client, opts = {}) {
    super()

    const defaults = {
      eos: {
        tokenContract,
        exchangeContract
      },
      requestTimeout: 10000,
      tokenContract,
      exchangeContract,
      state: {
        components: {
          Wallet,
          Orderbook,
          Orders
        },
        transform: {
          orderbook: {},
          orders: {},
          wallet: {}
        }
      }
    }

    _.defaultsDeep(opts, defaults)
    this.conf = opts

    this.scatter = null
    if (opts.eos.auth.scatter) {
      this.scatter = new SunbeamScatter({
        appName: opts.eos.auth.scatter.appName,
        ScatterJS: opts.eos.auth.scatter.ScatterJS
      })
    }

    if (client) {
      this.client = client
      this.signer = new SignHelper(this.client, opts)
    }

    this.account = null
    this.chainId = null

    this.cbq = new Cbq()
    this.tos = null

    this.transports = Object.keys(opts.urls).reduce((acc, el) => {
      acc[el] = new WsConnect({
        url: opts.urls[el]
      })

      return acc
    }, {})

    this._state = new State(opts.state)
    this.msgHandler = new WsMsgHandler({
      transports: this.transports,
      state: this._state,
      customHandler: this.handleRpcCalls.bind(this)
    })

    this.transportsStatus = {}
  }

  start () {
    const transports = Object.keys(this.transports)

    let i = 0
    transports.forEach((tn) => {
      const t = this.transports[tn]

      t.on('open', () => {
        this.registerTransport(tn, true)
        i++

        if (i === transports.length) {
          this.emit('open')
        }
      })

      t.on('error', (e) => { this.emit('error', e, tn) })
      t.on('message', (m) => { this.emit('message', m, tn) })

      t.open()
    })
  }

  registerTransport (name, connected = true) {
    this.transportsStatus[name] = { connected }
  }

  open () {
    this.start()
  }

  close () {
    const transports = Object.keys(this.transports)

    let i = 0
    transports.forEach((tn) => {
      this.registerTransport(tn, false)

      const t = this.transports[tn]
      t.on('close', () => {
        this.registerTransport(tn, true)
        i++

        if (i === transports.length) {
          this.emit('close')
        }
      })

      t.close()
    })
  }

  get state () {
    return this._state.state
  }

  send (transport, msg) {
    const t = this.transports[transport]

    if (!t) {
      throw new Error('ERR_MISSING_TRANSPORT')
    }

    t.send(msg)
  }

  subscribePublicTrades (symbol) {
    const { pub } = this.transports

    return pub.subscribe('trades', { symbol })
  }

  subscribeOrderbook (symbol) {
    const { pub } = this.transports

    return pub.subscribe('book', { symbol })
  }

  unsubscribeOrderbook (symbol) {
    const { pub } = this.transports

    return pub.unsubscribe('book', { symbol })
  }

  subscribe (transport, channel, args = {}) {
    const t = this.transports[transport]

    return t.subscribe(channel, args)
  }

  unsubscribe (transport, channel, args = {}) {
    const t = this.transports[transport]

    return t.unsubscribe(channel, args)
  }

  subscribeWallet () {
    return this.getAuth()
      .then((auth) => {
        const { account } = auth

        const { priv } = this.transports

        return priv.subscribe('wallets', { account })
      })
  }

  setAuth (auth = {}) {
    const {
      keys,
      client,
      scatter
    } = auth

    if (keys && client) {
      this.conf.eos.auth.keys = keys
      this.client = client
      this.signer = new SignHelper(this.client, this.conf)
      return
    }

    this.scatter = new SunbeamScatter(scatter)
  }

  acceptTos (version) {
    this.tos = version
  }

  sendAuth (user, signed) {
    const { priv } = this.transports

    this.account = user
    const { account } = user

    const payload = {
      event: 'auth',
      account: account,
      meta: signed,
      agree: this.tos
    }

    priv.send(payload)
  }

  async auth (data) {
    this.account = null

    if (data) {
      this.setAuth(data)
    }

    const auth = await this.getAuth()
    const signed = await this.getSignedTx(auth)
    this.sendAuth(auth, signed)

    return auth
  }

  requestChainMeta (transport) {
    return new Promise((resolve, reject) => {
      const { requestTimeout } = this.conf
      const reqId = Math.floor(Math.random() * 10E+15)

      this.sendReqRes(transport, {
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

  handleRpcCalls (m) {
    if (!this.msgHandler.isInfoMsg(m)) {
      return false
    }

    const [, id, data] = m

    if (id === 'ci') {
      this.emit('ci', data)
      return true
    }

    if (id === 'ct') {
      const id = m[2]
      this.emit('ct-' + id, m)
      return true
    }

    return false
  }

  getScope (symbol, side) {
    // eth.btc.a

    const s = side === 'ask' ? 'a' : 'b'
    return symbol.toLowerCase() + '.' + s
  }

  getChainId (transport) {
    return new Promise((resolve, reject) => {
      if (this.chainId) return resolve(this.chainId)

      this.requestChainMeta(transport).then((meta) => {
        const [, , chainId] = meta

        this.chainId = chainId
        resolve(this.chainId)
      }).catch(reject)
    })
  }

  async getNetwork (transport) {
    const chainId = await this.getChainId(transport)
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

  getAuth () {
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

      this.getNetwork('priv')
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

  async cancel (data) {
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

    const meta = await this.requestChainMeta('priv')
    const signed = await this.signer.signTx(
      args,
      auth,
      'cancel',
      meta,
      exchangeContract
    )

    const payload = [0, 'oc', null, { meta: signed }]
    this.send('priv', payload)

    return { payload, data: args }
  }

  async place (order) {
    const auth = await this.getAuth()
    const meta = await this.requestChainMeta('priv')
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
    this.send('priv', payload)

    return { payload, data: o.parsed }
  }

  async withdraw (data) {
    const { eos } = this.conf
    const { exchangeContract } = eos

    const { to, currency, amount } = data

    if (amount[0] === '-') {
      throw new Error('amount must be positive')
    }

    const amountPad = decimalPad(amount, 8)
    const amountPlusCurrency = `${amountPad} ${currency}`

    const auth = await this.getAuth()
    const args = {
      amount: amountPlusCurrency,
      to: to || auth.account
    }

    const meta = await this.requestChainMeta('priv')
    const signed = await this.signer.signTx(
      args,
      auth,
      'withdraw',
      meta,
      exchangeContract
    )

    const payload = [0, 'tx', null, { meta: signed }]
    this.send('priv', payload)

    return { payload, data: args }
  }

  async sweep (data) {
    const { currency, to } = data
    const { exchangeContract } = this.conf.eos

    const auth = await this.getAuth()
    const args = {
      symbol: currency.toLowerCase(),
      to: to || auth.account
    }

    const meta = await this.requestChainMeta('priv')
    const signed = await this.signer.signTx(
      args,
      auth,
      'sweep',
      meta,
      exchangeContract
    )

    const payload = [0, 'tx', null, { meta: signed }]
    this.send('priv', payload)

    return { payload, data: args }
  }

  async getSignedTx (user) {
    const auth = user || await this.getAuth()

    const args = {}
    const { exchangeContract } = this.conf.eos

    const meta = await this.requestChainMeta('priv')
    const signed = await this.signer.signTx(
      args,
      auth,
      'validate',
      meta,
      exchangeContract
    )

    return signed
  }

  sendReqRes (transport, req, cb) {
    const { reqId, requestTimeout, msg, ns } = req

    const _cb = (msg) => {
      clearTimeout(timeout)
      this.cbq.trigger(reqId, null, msg)
    }

    this.once(ns, _cb)

    const timeout = setTimeout(() => {
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

    this.send(transport, msg)
  }

  verifyTx (meta, uuid, opts = {}) {
    return new Promise((resolve, reject) => {
      try {
        const { requestTimeout } = opts

        if (!uuid) throw Error('uuid missing')

        uuid = uuid + ''
        const payload = [0, 'ct', uuid, { meta }]
        const data = {
          reqId: uuid,
          requestTimeout: requestTimeout || this.conf.requestTimeout,
          msg: payload,
          ns: 'ct-' + uuid
        }

        this.sendReqRes('aux', data, (err, res) => {
          if (err) return reject(err)
          resolve(res)
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  async deposit (data) {
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

    const meta = await this.requestChainMeta('priv')
    const signed = await this.signer.signTx(args, auth, 'transfer', meta, tokenContract)

    const payload = [0, 'tx', null, { meta: signed }]
    this.send('priv', payload)

    return { payload, data: args }
  }
}

class Sunbeam {
  constructor (client, opts) {
    const w = new MandelbrotEosfinex(client, opts)

    const trap = {
      get: function (obj, prop) {
        if (obj[prop]) {
          return obj[prop]
        }

        if (/^on.*/.test(prop)) {
          const hook = obj.msgHandler.addCallback(prop)

          obj[prop] = hook
          return hook
        }
      }
    }

    var ws = new Proxy(w, trap)

    return ws
  }
}

module.exports = Sunbeam
