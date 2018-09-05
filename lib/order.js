'use strict'

class Order {
  constructor (order, conf) {
    this.raw = order
  }

  maybeSetUser (account) {
    if (!this.parsed.account) {
      this.parsed.account = account
    }

    return this.parsed
  }

  getSide (amount) {
    if (typeof amount !== 'string') {
      amount = amount + ''
    }

    if (amount[0] === '-') {
      return 'a'
    }

    return 'b'
  }

  parse () {
    const { raw } = this

    const res = {
      clientId: raw.clientId || Date.now(),
      account: raw.account,
      flags: +raw.flags || 0
    }

    if (raw.type === 'EXCHANGE_LIMIT') {
      res.price = raw.price
    }

    if (raw.type === 'EXCHANGE_MARKET') {
      if (res.price) throw new Error(`Market order can't have a price`)
      res.price = 0
    }

    res.scope = `${raw.symbol.toLowerCase()}.${this.getSide(raw.amount)}`
    res.amount = raw.amount.replace('-', '') * 10000

    this.parsed = res
    return this.parsed
  }

  serialize () {
    const p = this.parsed

    const payload = {
      scope: p.scope,
      clId: p.clientId,
      account: p.account,
      price: p.price * 10000,
      qty: p.amount,
      flags: p.flags
    }

    return payload
  }
}

module.exports = Order
