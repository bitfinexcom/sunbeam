'use strict'

const MB = require('./mandelbrot-ws-base.js')

const Order = require('./order.js')
const Wallet = require('./managed-wallet.js')
const Orderbook = require('./managed-ob.js')
const Orders = require('./managed-orders.js')

const SignHelper = require('./order-sign.js')
const Cbq = require('cbq')

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

    this.cbq = new Cbq()
  }

  auth (opts) {
    const { account } = this.conf.eos

    const payload = { event: 'auth', account: account }
    this.send(payload)
  }

  subscribeTrades (symbol) {
    this.send({
      event: 'subscribe',
      channel: 'trades',
      symbol: symbol
    })
  }

  subscribeWallet () {
    const { account } = this.conf.eos

    this.send({
      event: 'subscribe',
      channel: 'wallets',
      account: account
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

  getAuth () {
    const { eos } = this.conf
    return { authorization: eos.account + eos.permission }
  }

  async cancel (data) {
    const { eos } = this.conf
    const { clientId, id, symbol, side } = data

    const scope = this.getScope(symbol, side)
    const args = {
      scope: scope,
      account: eos.account
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

    if (!this.signer) {
      throw new Error('please initialise Sunbeam with Eos.')
    }

    const auth = this.getAuth()
    const meta = await this.requestChainMeta()
    const signed = await this.signer.signTx(args, auth, 'cancel', meta)

    const payload = [0, 'oc', null, { meta: signed }]
    this.send(payload)
  }

  async place (order) {
    if (!this.signer) {
      throw new Error('please initialise Sunbeam with Eos.')
    }

    const { eos } = this.conf

    const auth = { authorization: eos.account + eos.permission }
    const meta = await this.requestChainMeta()

    const o = new Order(order, {})
    o.parse()
    o.maybeSetUser(eos.account)
    const serialized = o.serialize()

    const signed = await this.signer.signTx(serialized, auth, 'place', meta)

    const payload = [0, 'on', null, { meta: signed }]
    this.send(payload)
  }

  async withdraw (data) {
    const { eos } = this.conf

    const { to, currency, amount } = data

    if (amount[0] === '-') {
      throw new Error('amount must be positive')
    }

    const amountPad = eos.Eos.modules.format.DecimalPad(amount, 8)
    const amountPlusCurrency = `${amountPad} ${currency}`

    const args = {
      amount: amountPlusCurrency,
      to: to || eos.account
    }

    const auth = this.getAuth()
    const meta = await this.requestChainMeta()
    const signed = await this.signer.signTx(args, auth, 'withdraw', meta)

    const payload = [0, 'tx', null, { meta: signed }]
    this.send(payload)
  }

  async sweep (data) {
    const { eos } = this.conf
    const { currency, to } = data

    const args = {
      symbol: currency.toLowerCase(),
      to: to || eos.account
    }

    const auth = this.getAuth()
    const meta = await this.requestChainMeta()
    const signed = await this.signer.signTx(args, auth, 'sweep', meta)

    const payload = [0, 'tx', null, { meta: signed }]
    this.send(payload)
  }

  async deposit (data) {
    const { eos } = this.conf
    const { currency, amount } = data

    if (amount[0] === '-') {
      throw new Error('amount must be positive')
    }

    const amountPad = eos.Eos.modules.format.DecimalPad(amount, 8)
    const amountPlusCurrency = `${amountPad} ${currency}`

    const args = {
      from: eos.account,
      to: 'efinexchange',
      quantity: amountPlusCurrency,
      memo: '',
      account: 'efinextether'
    }

    const auth = this.getAuth()
    const meta = await this.requestChainMeta()
    const signed = await this.signer.signDeposit(args, auth, meta)

    const payload = [0, 'tx', null, { meta: signed }]
    this.send(payload)
  }
}

module.exports = MandelbrotEosfinex
