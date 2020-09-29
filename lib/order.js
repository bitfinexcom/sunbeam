'use strict'

const { decimalPad } = require('./util')

class Order {
  constructor (order, conf) {
    this.raw = order
    this.parse()
    this.seskey1 = conf.seskey1
    this.seskey2 = conf.seskey2
    this.ccyMap = conf.ccyMap || {}
  }

  parse () {
    const { raw } = this
    const res = {
      cid: +raw.cid || Date.now(),
      type: raw.type,
      flags: +raw.flags || 0,
      price: (raw.price || 0) + '',
      amount: raw.amount + '',
      symbol: raw.symbol
    }

    if (raw.gid) {
      res.gid = +raw.gid
    }

    this._parsed = res
    return res
  }

  get parsed () {
    return this._parsed
  }

  getMsgObj () {
    const p = this.parsed
    return {
      cid: p.cid,
      type: p.type,
      symbol: p.symbol,
      price: p.price,
      amount: p.amount,
      flags: p.flags
    }
  }

  serialize () {
    const p = this.parsed
    const [base, quote] = this._getSymbolData(p.symbol)

    return {
      order: {
        nonce: Date.now(),
        seskey1: this.seskey1,
        seskey2: this.seskey2,
        price: `${decimalPad(p.price, 8)} ${quote}`,
        amount: `${decimalPad(p.amount, 8)} ${base}`,
        flags: p.type === 'EXCHANGE MARKET' ? 1 : 0
      }
    }
  }

  _getCCY (ccy) {
    return this.ccyMap[ccy] || ccy
  }

  // tXXXYYY format is expected
  _getSymbolData (symbol) {
    const normalized = symbol.slice(1)
    const base = this._getCCY(normalized.substring(0, 3))
    const quote = this._getCCY(normalized.substring(3))
    return [base, quote]
  }
}

module.exports = Order
