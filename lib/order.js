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

    if (raw.tif) {
      const tifDate = new Date(raw.tif)
      if (tifDate === 'Invalid Date') {
        throw new Error('Invalid tif date format')
      }
      const dateStr = tifDate.toISOString()
      res.tif = dateStr.replace('T', ' ').substring(0, dateStr.length - 5)
    }

    this._parsed = res
    return res
  }

  get parsed () {
    return this._parsed
  }

  getMsgObj () {
    const p = this.parsed
    const res = {
      cid: p.cid,
      type: p.type,
      symbol: p.symbol,
      price: p.price,
      amount: p.amount,
      flags: p.flags
    }

    if (p.gid) {
      res.gid = p.gid
    }

    if (p.tif) {
      res.tif = p.tif
    }

    return res
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

  // tXXXYYY or tXXX:YYY format is expected
  _getSymbolData (symbol) {
    const normalized = symbol.slice(1)
    let [base, quote] = normalized.split(':')
    if (!quote) {
      base = normalized.substring(0, 3)
      quote = normalized.substring(3)
    }
    return [this._getCCY(base), this._getCCY(quote)]
  }
}

module.exports = Order
