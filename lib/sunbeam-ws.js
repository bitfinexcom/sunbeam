'use strict'

const MB = require('./mandelbrot-ws-base.js')

const Order = require('./order.js')
const Wallet = require('./managed-wallet.js')
const Orderbook = require('./managed-ob.js')

const SignHelper = require('./http-order-sign.js')

class MandelbrotEosfinex extends MB {
  constructor (opts = {
    transform: {},
    url: null,
    Wallet: Wallet,
    Orderbook: Orderbook
  }) {
    const Ob = opts.Orderbook || Orderbook
    if (!opts.Orderbook) opts.Orderbook = Ob

    super(opts)

    if (opts.eos.Eos) this.signer = new SignHelper(opts)

    this.wallet = new Wallet(opts.transform.wallet)
    this.Orderbook = Ob

    this.managedBooks = {}
    this.managedHandlers = {} // onMangedXyUpdate
  }

  auth (opts) {
    const { account } = this.conf.eos

    const payload = { event: 'auth', account: account }
    this.send(payload)
  }

  isSnapshot (data) {
    return Array.isArray(data[0])
  }

  subscribeWallet () {
    const { account } = this.conf.eos

    this.send({
      event: 'subscribe',
      channel: 'wallets',
      account: account
    })
  }

  unSubscribeWallet () {
    const { account } = this.conf.eos
    this.unsubscribe('wallets', { account })
  }

  async place (order) {
    if (!this.signer) {
      throw new Error('please initialise Sunbeam with Eos.')
    }

    const { eos } = this.conf

    const auth = { authorization: this.conf.eos.account + '@active' }

    const o = new Order(order, {})
    o.parse()
    o.maybeSetUser(eos.account)
    const serialized = o.serialize()

    const signed = await this.signer.signOrder(serialized, auth)

    const payload = [0, 'on', null, { meta: signed }]
    this.send(payload)
  }
}

module.exports = MandelbrotEosfinex
