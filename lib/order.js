'use strict'

const BN = require('big.js')

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
      flags: +raw.flags || 0,
      price: raw.price || '0'
    }

    if (raw.type === 'EXCHANGE_LIMIT') {
      res.price = new BN(res.price + '').mul(10000).toString()
    }

    if (raw.type === 'EXCHANGE_MARKET') {
      if (!res.flags) res.flags = 4
      if (!(res.flags & 4)) res.flags = res.flags + 4
    }

    res.scope = `${raw.symbol.toLowerCase()}.${this.getSide(raw.amount)}`

    res.amount = raw.amount.replace('-', '')
    res.amount = new BN(res.amount + '').mul(10000).toString()

    this.parsed = res
    return this.parsed
  }

  serialize () {
    const p = this.parsed

    const payload = {
      scope: p.scope,
      clId: p.clientId,
      account: p.account,
      qty: p.amount,
      flags: p.flags,
      price: p.price
    }

    return payload
  }
}

module.exports = Order
