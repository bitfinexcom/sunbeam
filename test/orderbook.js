/* eslint-env mocha */

'use strict'

const Orderbook = require('../lib/managed-ob.js')
const assert = require('assert')

describe('orderbook helper', () => {
  it('takes snapshots', () => {
    const o = new Orderbook()
    const snap = [
      [ '18446744073709551615', 5000000, 10000 ],
      [ '1', 5010000, -12000 ],
      [ '2', 5010000, -12000 ]
    ]

    o.setSnapshot(snap)

    assert.deepEqual(snap, o.getState())
  })

  it('applies decimal transforms', () => {
    const o = new Orderbook({ decimals: 4 })
    const snap = [
      [ '18446744073709551615', 5000000, 10000 ],
      [ '1', 5010000, -12000 ],
      [ '2', 5010000, -12000 ]
    ]

    o.setSnapshot(snap)

    assert.deepEqual([
      [ '18446744073709551615', 500, 1 ],
      [ '1', 501, -1.2 ],
      [ '2', 501, -1.2 ]
    ], o.getState())
  })

  it('applies keyed transforms transforms', () => {
    const o = new Orderbook({ keyed: true })
    const snap = [
      [ '18446744073709551615', 5000000, 10000 ],
      [ '1', 5010000, -12000 ],
      [ '2', 5010000, -12000 ]
    ]

    o.setSnapshot(snap)
    const exp = {
      asks: [{
        amount: -12000,
        id: '1',
        price: 5010000
      },
      {
        amount: -12000,
        id: '2',
        price: 5010000
      }],
      bids: [{
        amount: 10000,
        id: '18446744073709551615',
        price: 5000000
      }]
    }

    assert.deepEqual(exp, o.getState())
  })

  it('deletes entries from raw snaps', () => {
    const o = new Orderbook()

    const snap = [
      [ '18446744073709551615', 5000000, 10000 ],
      [ '18446744073709551614', 10000, 10000 ],
      [ '1', 5010000, -12000 ],
      [ '2', 5010000, -12000 ],
      [ '3', 5010000, -12000 ]
    ]

    o.setSnapshot(snap)

    const update = [ '18446744073709551614', 0, 0 ]
    o.applyUpdate(update)

    assert.deepEqual([
      [ '18446744073709551615', 5000000, 10000 ],
      [ '1', 5010000, -12000 ],
      [ '2', 5010000, -12000 ],
      [ '3', 5010000, -12000 ]
    ], o.getState())
  })

  it('deletes entries from keyed snaps', () => {
    const o = new Orderbook({ keyed: true })

    const snap = [
      [ '18446744073709551615', 5000000, 10000 ],
      [ '18446744073709551614', 10000, 10000 ],
      [ '1', 5010000, -12000 ],
      [ '2', 5010000, -12000 ]
    ]

    o.setSnapshot(snap)

    const update = [ '18446744073709551614', 0, 0 ]
    o.applyUpdate(update)

    const exp = {
      asks: [{
        amount: -12000,
        id: '1',
        price: 5010000
      },
      {
        amount: -12000,
        id: '2',
        price: 5010000
      }],
      bids: [{
        amount: 10000,
        id: '18446744073709551615',
        price: 5000000
      }]
    }

    assert.deepEqual(exp, o.getState())
  })

  it('adds entries to raw snaps', () => {
    const o = new Orderbook()

    const snap = [
      [ '18446744073709551615', 5000000, 10000 ],
      [ '3', 5010000, -12000 ]
    ]

    o.setSnapshot(snap)

    const update = [ '4', 10000, 10000 ]
    o.applyUpdate(update)

    assert.deepEqual([
      [ '18446744073709551615', 5000000, 10000 ],
      [ '3', 5010000, -12000 ],
      [ '4', 10000, 10000 ]
    ], o.getState())
  })

  it('adds entries to keyed snaps, asks', () => {
    const o = new Orderbook({ keyed: true })

    const snap = [
      [ '18446744073709551615', 5000000, 10000 ],
      [ '1', 5010000, -12000 ],
      [ '2', 5010000, -12000 ]
    ]

    o.setSnapshot(snap)

    const update = [ '5', 10000, -10000 ] // sell- ask
    o.applyUpdate(update)

    const exp = {
      asks: [{
        amount: -12000,
        id: '1',
        price: 5010000
      },
      {
        amount: -12000,
        id: '2',
        price: 5010000
      },
      {
        amount: -10000,
        id: '5',
        price: 10000
      }],
      bids: [{
        amount: 10000,
        id: '18446744073709551615',
        price: 5000000
      }]
    }

    assert.deepEqual(exp, o.getState())
  })

  it('adds entries to keyed snaps, bids', () => {
    const o = new Orderbook({ keyed: true })

    const snap = [
      [ '18446744073709551615', 5000000, 10000 ],
      [ '1', 5010000, -12000 ],
      [ '2', 5010000, -12000 ]
    ]

    o.setSnapshot(snap)

    const update = [ '18446744073709551614', 10000, 10001 ] // sell- ask
    o.applyUpdate(update)

    const exp = {
      asks: [{
        amount: -12000,
        id: '1',
        price: 5010000
      },
      {
        amount: -12000,
        id: '2',
        price: 5010000
      }],
      bids: [{
        amount: 10000,
        id: '18446744073709551615',
        price: 5000000
      },
      {
        amount: 10001,
        id: '18446744073709551614',
        price: 10000
      }]
    }

    assert.deepEqual(exp, o.getState())
  })

  it('added entries have decimals conversion', () => {
    const o = new Orderbook({ keyed: true, decimals: 4 })

    const snap = [
      [ '18446744073709551615', 5000000, 10000 ],
      [ '1', 5010000, -12000 ],
      [ '2', 5010000, -12000 ]
    ]

    o.setSnapshot(snap)

    const update = [ '5', 10000, -10000 ] // sell- ask
    o.applyUpdate(update)

    const exp = {
      asks: [{
        amount: -1.2,
        id: '1',
        price: 501
      },
      {
        amount: -1.2,
        id: '2',
        price: 501
      },
      {
        amount: -1,
        id: '5',
        price: 1
      }],
      bids: [{
        amount: 1,
        id: '18446744073709551615',
        price: 500
      }]
    }

    assert.deepEqual(exp, o.getState())
  })

  it('handles empty order books', () => {
    const o = new Orderbook()

    o.update([]) // [ 'BTC.USD', [] ]

    assert.deepEqual([], o.getState())
  })

  it('detects snapshots and updates', () => {
    const o = new Orderbook()
    const snap = [
      [ '18446744073709551615', 5000000, 10000 ],
      [ '1', 5010000, -12000 ],
      [ '2', 5010000, -12000 ]
    ]

    o.update(snap)

    assert.deepEqual(snap, o.getState())

    const update = [ '4', 10000, 10000 ]
    o.update(update)

    assert.deepEqual([
      [ '18446744073709551615', 5000000, 10000 ],
      [ '1', 5010000, -12000 ],
      [ '2', 5010000, -12000 ],
      [ '4', 10000, 10000 ]
    ], o.getState())
  })

  it('parses data', () => {
    const o = new Orderbook()
    const snap = [
      [ '18446744073709551615', 5000000, 10000 ],
      [ '1', 5010000, -12000 ],
      [ '2', 5010000, -12000 ]
    ]

    assert.deepEqual(snap, o.parse(snap))

    const update = [ '4', 10000, 10000 ]
    assert.deepEqual(update, o.parse(update))
    o.parse(update)
  })
})
