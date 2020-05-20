/* eslint-env mocha */

'use strict'

const Order = require('../lib/order.js')
const assert = require('assert')

const conf = {
  seskey1: 123,
  seskey2: 456
}

describe('order helper', () => {
  it('casts amount and price to string', () => {
    const ask = new Order({
      symbol: 'tBTCUSD',
      price: 520,
      amount: -0.99,
      type: 'EXCHANGE LIMIT'
    }, conf)

    assert.strictEqual(typeof ask.parsed.price, 'string')
    assert.strictEqual(typeof ask.parsed.amount, 'string')
  })

  it('omits gid if not passed', () => {
    const ask = new Order({
      symbol: 'tBTCUSD',
      price: 520,
      amount: -0.99,
      type: 'EXCHANGE LIMIT'
    }, conf)

    assert.strictEqual(typeof ask.parsed.gid, 'undefined')
  })

  it('casts gid to number', () => {
    const ask = new Order({
      symbol: 'tBTCUSD',
      price: 520,
      amount: -0.99,
      type: 'EXCHANGE LIMIT',
      gid: '123'
    }, conf)

    assert.strictEqual(typeof ask.parsed.gid, 'number')
  })

  it('sets client id to timestamp by default', () => {
    const d = Date.now()
    const ask = new Order({
      symbol: 'tBTCUSD',
      amount: '-0.99',
      price: 520,
      type: 'EXCHANGE MARKET'
    }, conf)

    assert.ok(ask.parsed.cid - d >= 0 && ask.parsed.cid - d <= 1000)
  })

  it('sets flags to 0 by default', () => {
    const ask = new Order({
      symbol: 'tBTCUSD',
      amount: '-0.99',
      price: 520,
      type: 'EXCHANGE MARKET'
    }, conf)

    assert.strictEqual(ask.parsed.flags, 0)
  })

  it('builds message object from parsed value', () => {
    const ask = new Order({
      symbol: 'tBTCUSD',
      amount: '-0.99',
      price: 520,
      type: 'EXCHANGE MARKET'
    }, conf)

    assert.deepStrictEqual(ask.getMsgObj(), {
      cid: ask.parsed.cid,
      type: 'EXCHANGE MARKET',
      symbol: 'tBTCUSD',
      price: '520',
      amount: '-0.99'
    })
  })

  it('serializes order data', () => {
    const ask = new Order({
      symbol: 'tBTCUSD',
      amount: '-0.99',
      price: '440',
      type: 'EXCHANGE MARKET',
      flags: 4
    }, conf)
    const d = Date.now()
    const { order } = ask.serialize()

    assert.ok(order.nonce - d >= 0 && order.nonce - d <= 1000)
    assert.strictEqual(order.seskey1, conf.seskey1)
    assert.strictEqual(order.seskey2, conf.seskey2)
    assert.strictEqual(order.price, '440.0000000000 USD')
    assert.strictEqual(order.amount, '-0.9900000000 BTC')
    assert.strictEqual(order.flags, 4)
  })

  it('converts UST to USDT in order object', () => {
    const ask = new Order({
      symbol: 'tBTCUST',
      amount: '-0.99',
      price: '440',
      type: 'EXCHANGE MARKET',
      flags: 4
    }, conf)
    const d = Date.now()
    const { order } = ask.serialize()

    assert.ok(order.nonce - d >= 0 && order.nonce - d <= 1000)
    assert.strictEqual(order.seskey1, conf.seskey1)
    assert.strictEqual(order.seskey2, conf.seskey2)
    assert.strictEqual(order.price, '440.0000000000 USDT')
    assert.strictEqual(order.amount, '-0.9900000000 BTC')
    assert.strictEqual(order.flags, 4)
  })
})
