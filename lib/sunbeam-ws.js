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

  handleOrderbookMessage (msg) {
    if (!msg) return

    const [ chanId, data ] = msg

    const { symbol } = this.channels['book'][chanId]
    const handler = this.bookHandlers[symbol]

    const tOpts = this.conf.transform.orderbook
    const isSnapshot = Array.isArray(data[0])

    if (isSnapshot) {
      const s = this.handleSnapshot(data, tOpts)
      handler(s)
      return
    }

    // simple update
    let update = this.handleObUpdate(data, tOpts)
    handler(update)
  }

  handleObUpdate (el, opts) {
    const { decimals, keyed } = opts
    const dt = this.decimalsTransformer

    let update
    const [id, price, amount] = el
    if (decimals) {
      update = [id, dt(price, decimals), dt(amount, decimals)]
    }

    if (keyed) {
      update = {
        id: update[0],
        price: update[1],
        amount: update[2]
      }
    }

    return update
  }

  handleSnapshot (snap, opts) {
    const { decimals, keyed } = opts
    const dt = this.decimalsTransformer

    // raw
    if (!keyed && !decimals) {
      return snap
    }

    if (decimals) {
      snap = snap.map((el) => {
        const [id, price, amount] = el
        return [id, dt(price, decimals), dt(amount, decimals)]
      })
    }

    if (!keyed) {
      return snap
    }

    const asks = snap.filter(el => el[2] > 0)
    const bids = snap.filter(el => el[2] < 0)

    const mp = (el) => {
      // [id, price, amount]
      const order = {
        id: el[0],
        price: el[1],
        amount: el[2]
      }

      return order
    }

    const ob = {
      asks: bids.map(mp).sort((a, b) => b.price - a.price),
      bids: asks.map(mp).sort((a, b) => a.price - b.price)
    }

    return ob
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
