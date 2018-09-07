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

    if (!opts.eos.permission) {
      opts.eos.permission = '@active'
    }
  }

  auth (opts) {
    const { account } = this.conf.eos

    const payload = { event: 'auth', account: account }
    this.send(payload)
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

  getScope (symbol, side) {
    // eth.btc.a

    const s = side === 'ask' ? 'a' : 'b'
    return symbol.toLowerCase() + '.' + s
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

    const auth = { authorization: eos.account + eos.permission }
    const signed = await this.signer.signTx(args, auth, 'cancel')

    const payload = [0, 'oc', null, { meta: signed }]
    this.send(payload)
  }

  async place (order) {
    if (!this.signer) {
      throw new Error('please initialise Sunbeam with Eos.')
    }

    const { eos } = this.conf

    const auth = { authorization: eos.account + eos.permission }

    const o = new Order(order, {})
    o.parse()
    o.maybeSetUser(eos.account)
    const serialized = o.serialize()

    const signed = await this.signer.signTx(serialized, auth, 'place')

    const payload = [0, 'on', null, { meta: signed }]
    this.send(payload)
  }
}

module.exports = MandelbrotEosfinex
