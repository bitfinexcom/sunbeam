'use strict'

const MB = require('./mandelbrot-ws-base.js')

const Order = require('./order.js')
const SignHelper = require('./http-order-sign.js')

class MandelbrotEosfinex extends MB {
  constructor (opts = {
    transform: false,
    url: null
  }) {
    super(opts)

    this.signer = new SignHelper(opts)
  }

  subscribeOrderBook (symbol) {
    symbol = symbol.toLowerCase()
    return this.subscribe('book', { symbol })
  }

  async place (order) {
    const { eos } = this.conf

    const auth = { authorization: this.conf.eos.account + '@active' }

    const o = new Order(order, { Eos: eos.Eos })
    o.parse()
    o.maybeSetUser(eos.account)
    const serialized = o.serialize()

    const signed = await this.signer.signOrder(serialized, auth)

    const payload = [0, 'on', null, { meta: signed }]
    this.send(payload)
  }
}

module.exports = MandelbrotEosfinex
