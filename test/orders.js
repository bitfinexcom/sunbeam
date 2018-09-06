/* eslint-env mocha */

'use strict'

const Order = require('../lib/order.js')
const assert = require('assert')

const conf = {}

describe('order helper', () => {
  it('sets bid and ask scope', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      price: '520',
      amount: '-0.99',
      type: 'EXCHANGE_LIMIT'
    }, conf)

    assert.equal(ask.parse().scope, 'btc.usd.a')
    assert.equal(ask.parse().amount, '9900')

    const bid = new Order({
      symbol: 'BTC.USD',
      price: '520',
      amount: '0.99',
      type: 'EXCHANGE_LIMIT'
    }, conf)

    assert.equal(bid.parse().scope, 'btc.usd.b')
    assert.equal(bid.parse().amount, '9900')
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

  it('market order sets flags', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_MARKET'
    }, conf)

    ask.parse()

    assert.equal(ask.serialize().flags, 4)
  })

  it('market order flag set respects existing flags', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_MARKET',
      flags: 1 // post only
    }, conf)

    ask.parse()

    assert.equal(ask.serialize().flags, 5)
  })

  it('market order flag works with order type market order', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_MARKET',
      flags: 4
    }, conf)

    ask.parse()

    assert.equal(ask.serialize().flags, 4)
  })

  it('post only flag works', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_LIMIT',
      flags: 1
    }, conf)

    ask.parse()

    assert.equal(ask.serialize().flags, 1)
  })

  it('price must be always present', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_MARKET',
      flags: 1
    }, conf)

    ask.parse()

    assert.equal(ask.serialize().price, '0')
  })

  it('prices and amounts float32 issue', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '0.678',
      price: '0.678',
      type: 'EXCHANGE_LIMIT'
    }, conf)

    ask.parse()

    assert.equal(ask.serialize().price, '6780')
    assert.equal(ask.serialize().qty, '6780')
  })
})
