/* eslint-env mocha */

'use strict'

const Order = require('../lib/order.js')
const assert = require('assert')

const conf = {}

xdescribe('order helper', () => {
  it('sets bid and ask scope', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      price: '520',
      amount: '-0.99',
      type: 'EXCHANGE_LIMIT'
    }, conf)

    assert.strictEqual(ask.parse().scope, 'btc.usd.a')
    assert.strictEqual(ask.parse().amount, '9900')

    const bid = new Order({
      symbol: 'BTC.USD',
      price: '520',
      amount: '0.99',
      type: 'EXCHANGE_LIMIT'
    }, conf)

    assert.strictEqual(bid.parse().scope, 'btc.usd.b')
    assert.strictEqual(bid.parse().amount, '9900')
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

    assert.strictEqual(ask.serialize().flags, 4)
  })

  it('market order flag set respects existing flags', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_MARKET',
      flags: 1 // post only
    }, conf)

    ask.parse()

    assert.strictEqual(ask.serialize().flags, 5)
  })

  it('market order flag works with order type market order', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_MARKET',
      flags: 4
    }, conf)

    ask.parse()

    assert.strictEqual(ask.serialize().flags, 4)
  })

  it('post only flag works', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_LIMIT',
      flags: 1
    }, conf)

    ask.parse()

    assert.strictEqual(ask.serialize().flags, 1)
  })

  it('post only via prop supported', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_LIMIT',
      postOnly: true
    }, conf)

    ask.parse()

    assert.strictEqual(ask.serialize().flags, 1)
  })

  it('post only via prop + flag is ok', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_LIMIT',
      postOnly: true,
      flags: 5 // 1 + 4
    }, conf)

    ask.parse()

    assert.strictEqual(ask.serialize().flags, 5)
  })

  it('postOnly prop overrides flag', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_LIMIT',
      postOnly: true,
      flags: 0
    }, conf)

    ask.parse()

    assert.strictEqual(ask.serialize().flags, 1)
  })

  it('price must be always present', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_MARKET',
      flags: 1
    }, conf)

    ask.parse()

    assert.strictEqual(ask.serialize().price, '0')
  })

  it('EXCHANGE_IOC order sets flags', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_IOC'
    }, conf)

    ask.parse()

    assert.strictEqual(ask.serialize().flags, 2)
  })

  it('EXCHANGE_IOC order sets flags, collision with market order', () => {
    const ask = new Order({
      symbol: 'BTC.USD',
      amount: '-0.99',
      type: 'EXCHANGE_IOC',
      flags: 4
    }, conf)

    assert.throws(() => {
      ask.parse()
    }, { message: /overload/ })
  })
})
