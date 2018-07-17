'use strict'

class Order {
  constructor (order, conf) {
    this.raw = order
    this.Eos = conf.Eos
  }

  maybeSetUser (account) {
    if (!this.parsed.account) {
      this.parsed.account = account
    }

    return this.parsed
  }

  parse () {
    const { raw } = this

    const res = {
      symbol: raw.symbol,
      clientId: raw.clientId,
      account: raw.account
    }

    if (!res.clientId) res.clientId = Date.now()

    if (typeof raw.postOnly !== 'boolean') res.postOnly = false
    res.postOnly = res.postOnly ? 1 : 0

    if (raw.type === 'EXCHANGE_LIMIT') {
      res.price = raw.price
    }

    if (raw.type === 'EXCHANGE_MARKET') {
      if (res.price) throw new Error(`Market order can't have a price`)
      res.price = 0
    }

    res.amount = this.Eos.modules.format.DecimalPad(raw.amount, 10)

    this.parsed = res
    return this.parsed
  }

  serialize () {
    const p = this.parsed

    const payload = {
      clId: p.clientId,
      account: p.account,
      qty_and_pair: p.amount + ' ' + p.symbol,
      postOnly: p.postOnly,
      priceDbl: p.price
    }

    return payload
  }
}

module.exports = Order
