'use strict'

let { URL } = require('url')
const Order = require('./order.js')
const BN = require('big.js')
const _UI64_MAX = new BN('18446744073709551615')

if (!URL) {
  URL = window.URL
}

class Sunbeam {
  constructor (eos, sunbeamConf = {}) {
    const { readNodeConf, writeNodeConf, Eos } = eos

    this.Eos = Eos
    this.readEos = null
    this.writeEos = null

    this.configureNodes(readNodeConf, writeNodeConf, sunbeamConf)
    this.conf = sunbeamConf
  }

  configureNodes (readNodeConf, writeNodeConf, sunbeamConf) {
    if (!readNodeConf.httpEndpoint) {
      readNodeConf.httpEndpoint = 'http://127.0.0.1:8888'
    }

    if (!writeNodeConf.httpEndpoint) {
      writeNodeConf.httpEndpoint = 'http://127.0.0.1:8888'
    }

    const rnU = new URL(readNodeConf.httpEndpoint)
    const wnU = new URL(writeNodeConf.httpEndpoint)

    if (rnU.host === wnU.host && !sunbeamConf.dev) {
      throw new Error('need seperate write and read node')
    }

    this.readEos = this.Eos(readNodeConf)
    this.writeEos = this.Eos(writeNodeConf)
  }

  getAuth () {
    return { authorization: this.conf.account + '@active' }
  }

  // add opts.limit when ordering by secondary indexes works again
  // so we do not have to fetch everything to see prices
  orderbook (pair, opts = { transform: false }, cb) {
    const book = pair.toLowerCase()
    const transformer = this.transformApi2

    this.fetchOb(book.toLowerCase(), { maxEntries: Infinity }, (err, res) => {
      if (err) return cb(err)
      if (opts.transform) res = transformer(res)

      cb(null, res)
    })
  }

  orders (pair, opts, cb) {
    const book = pair.toLowerCase()
    const user = opts.user || this.conf.account
    const filter = this.userFilter

    this.fetchOb(book, { maxEntries: Infinity }, (err, res) => {
      if (err) return cb(err)
      res = filter(res, user)

      cb(null, res)
    })
  }

  createOrder (o) {
    return new Order(o, { Eos: this.Eos })
  }

  userFilter (d, user) {
    const reducer = (acc, el) => {
      if (el.account === user) {
        acc.push(el)
      }

      return acc
    }

    const res = {
      bids: d.bids.reduce(reducer, []),
      asks: d.asks.reduce(reducer, [])
    }

    return res
  }

  transformApi2 (d) {
    const reducer = (side) => {
      return (acc, el) => {
        // For Trading: if AMOUNT > 0 then bid else ask.
        if (side === 'asks') el.qty = '-' + el.qty

        const entry = {
          orderID: +el.id,
          price: +el.price,
          amount: +el.qty
        }

        acc.push(entry)
        return acc
      }
    }

    const res = {
      bids: d.bids.reduce(reducer('bids'), []),
      asks: d.asks.reduce(reducer('asks'), [])
    }

    return res
  }

  fetchOb (cur, opts, cb) {
    const { maxEntries, maxEntriesPerRequest } = opts
    const limit = maxEntriesPerRequest || 200

    if (maxEntries !== Infinity) {
      return cb(new Error('not implemented'))
    }

    const getPayload = (token, side, opts) => {
      const { upper, lower } = opts

      const pl = {
        code: 'efinexchange',
        scope: token + '.' + side,
        table: 'orders',
        limit: limit,
        json: true
      }

      if (upper) pl.upper_bound = upper
      if (lower) pl.lower_bound = lower

      return pl
    }

    const getUintLeftPad = (int, limit = 20) => {
      const tail = ('' + int).split('')
      const head = new Array(limit - tail.length).fill(0)

      return head.concat(tail).join('')
    }

    const getTableRows = this.readEos.getTableRows
    function getPaginatedTableRec (side) {
      return new Promise((resolve, reject) => {
        let res = []

        function _getPaginatedTableRec (payload) {
          getTableRows(payload).then((table) => {
            res = res.concat(table.rows)
            if (!table.more) return resolve(res)

            // get the next entries
            const lastId = new BN(table.rows[table.rows.length - 1].id)
            let lower = lastId.plus(limit + '')
            if (lower.gte(_UI64_MAX)) {
              lower = _UI64_MAX
            }

            lower = getUintLeftPad(lower.toString())

            _getPaginatedTableRec(getPayload(cur, side, { lower: lower }))
          }).catch((err) => {
            reject(err)
          })
        }

        _getPaginatedTableRec(getPayload(cur, side, {}))
      })
    }

    Promise.all([
      getPaginatedTableRec('a'),
      getPaginatedTableRec('b')
    ]).then((res) => {
      return cb(null, { asks: res[0], bids: res[1] })
    }).catch((err) => {
      cb(err)
    })
  }

  place (order, cb = () => {}) {
    order.parse()
    order.maybeSetUser(this.conf.account)

    this.writeEos.contract('efinexchange').then((contract) => {
      const args = order.serialize()

      return contract.place(args, { authorization: args.account + '@active' })
    })
      .then((res) => {
        return cb(null, res)
      })
      .catch((err) => { cb(err) })
  }

  getScope (symbol, side) {
    const s = side === 'ask' ? 'a' : 'b'
    return symbol.toLowerCase() + '.' + s
  }

  cancel (data, opts, cb = () => {}) {
    const { id, symbol, side } = data

    const scope = this.getScope(symbol, side)
    this.writeEos.contract('efinexchange').then((contract) => {
      const args = {
        id: id,
        scope: scope
      }

      return contract.cancel(args, this.getAuth())
    })
      .then((res) => {
        return cb(null, res)
      })
      .catch((err) => { cb(err) })
  }

  withdraw (data, opts, cb = () => {}) {
    const { to, currency, amount } = data

    if (amount[0] === '-') {
      return cb(new Error('amount must be positive'))
    }

    const amountPad = this.Eos.modules.format.DecimalPad(amount, 10)

    this.writeEos.contract('efinexchange').then((contract) => {
      const args = {
        amount: amountPad + ' ' + currency,
        to: to || this.conf.account
      }

      return contract.withdraw(args, this.getAuth())
    })
      .then((res) => {
        return cb(null, res)
      })
      .catch((err) => { cb(err) })
  }

  balance (cb = () => {}) {
    this.readEos.getCurrencyBalance('efinexchange', this.conf.account)
      .then((res) => {
        return cb(null, res)
      })
      .catch((err) => { cb(err) })
  }

  transfer () { throw new Error('not implemented') }
}

module.exports = Sunbeam
