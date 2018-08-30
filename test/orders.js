/* eslint-env mocha */

'use strict'

const Order = require('../lib/order.js')
const assert = require('assert')
const Eos = require('eosjs')

const conf = {
  Eos: Eos
}

describe('order helper', () => {
  it('sets bid and ask scope', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      price: '520',
      amount: '-0.99',
      type: 'EXCHANGE_LIMIT'
    }, conf)

    assert.equal(ask.parse().scope, 'btc.usd.a')
    assert.equal(ask.parse().amount, '0.9900000000')

    const bid = new Order({
      symbol: 'BTC.USD',
      price: '520',
      amount: '0.99',
      type: 'EXCHANGE_LIMIT'
    }, conf)

    assert.equal(bid.parse().scope, 'btc.usd.b')
    assert.equal(bid.parse().amount, '0.9900000000')
  })

  it('no price for market orders', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_MARKET'
    }, conf)

    assert.equal(ask.parse().price, '0')
  })

  it('client id is timestamp by default', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_MARKET'
    }, conf)

    const d = Date.now()
    ask.parse()

    assert.ok(ask.serialize().clId >= d)
  })
})
