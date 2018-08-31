/* eslint-env mocha */

'use strict'

const Wallet = require('../lib/managed-wallet.js')
const assert = require('assert')

describe('wallet helper', () => {
  it('takes snapshots', () => {
    const w = new Wallet()
    const snap = [
      [ 'exchange', 'USD', 9700000000 ],
      [ 'exchange', 'ETH', 10000000000 ]
    ]
    w.setSnapshot(snap)

    assert.deepEqual(snap, w.getState())
  })

  it('applies updates to snapshots', () => {
    const w = new Wallet()
    const snap = [
      [ 'exchange', 'USD', 9700000000 ],
      [ 'exchange', 'ETH', 10000000000 ]
    ]

    w.setSnapshot(snap)
    w.applyUpdate(['exchange', 'eth', 9600000000, 'testuser1414'])

    assert.deepEqual([
      [ 'exchange', 'USD', 9700000000 ],
      [ 'exchange', 'ETH', 9600000000 ]
    ], w.getState())
  })

  it('adds new wallet types to snapshots', () => {
    const w = new Wallet()
    const snap = [
      [ 'exchange', 'USD', 9700000000 ],
      [ 'exchange', 'ETH', 10000000000 ]
    ]

    w.setSnapshot(snap)
    w.applyUpdate(['trade', 'ETH', 9600000000, 'testuser1414'])

    assert.deepEqual([
      [ 'exchange', 'USD', 9700000000 ],
      [ 'exchange', 'ETH', 10000000000 ],
      [ 'trade', 'ETH', 9600000000 ]
    ], w.getState())
  })

  it('adds new currencies to snapshots', () => {
    const w = new Wallet()
    const snap = [
      [ 'exchange', 'USD', 9700000000 ],
      [ 'exchange', 'ETH', 10000000000 ]
    ]

    w.setSnapshot(snap)
    w.applyUpdate(['exchange', 'EOS', 9600000000, 'testuser1414'])

    assert.deepEqual([
      [ 'exchange', 'USD', 9700000000 ],
      [ 'exchange', 'ETH', 10000000000 ],
      [ 'exchange', 'EOS', 9600000000 ]
    ], w.getState())
  })

  it('provides convinience methods that accepts snaps and updates', () => {
    const w = new Wallet()
    const snap = [
      [ 'exchange', 'USD', 9700000000 ],
      [ 'exchange', 'ETH', 10000000000 ]
    ]

    w.update(snap)

    w.update(['exchange', 'EOS', 9600000000, 'testuser1414'])

    assert.deepEqual([
      [ 'exchange', 'USD', 9700000000 ],
      [ 'exchange', 'ETH', 10000000000 ],
      [ 'exchange', 'EOS', 9600000000 ]
    ], w.getState())
  })

  it('supports decimals transforms, initial snap', () => {
    const w = new Wallet({ decimals: 8 })
    const snap = [
      [ 'exchange', 'USD', 9700000000 ],
      [ 'exchange', 'ETH', 10000000000 ]
    ]

    w.update(snap)

    assert.deepEqual([
      [ 'exchange', 'USD', 97 ],
      [ 'exchange', 'ETH', 100 ]
    ], w.getState())
  })

  it('supports decimals transforms, update message append', () => {
    const w = new Wallet({ decimals: 8 })
    const snap = [
      [ 'exchange', 'USD', 9700000000 ],
      [ 'exchange', 'ETH', 10000000000 ]
    ]

    w.update(snap)

    w.update([ 'exchange', 'EOS', 9900000000 ])

    assert.deepEqual([
      [ 'exchange', 'USD', 97 ],
      [ 'exchange', 'ETH', 100 ],
      [ 'exchange', 'EOS', 99 ]
    ], w.getState())
  })

  it('supports decimals transforms, update entry replace', () => {
    const w = new Wallet({ decimals: 8 })
    const snap = [
      [ 'exchange', 'USD', 9700000000 ],
      [ 'exchange', 'ETH', 10000000000 ]
    ]

    w.update(snap)

    w.update([ 'exchange', 'ETH', 9900000000 ])

    assert.deepEqual([
      [ 'exchange', 'USD', 97 ],
      [ 'exchange', 'ETH', 99 ]
    ], w.getState())
  })

  it('parse() calls do not affect internal state', () => {
    const w = new Wallet({ decimals: 8 })
    const snap = [
      [ 'exchange', 'USD', 9700000000 ],
      [ 'exchange', 'ETH', 9900000000 ]
    ]

    w.update(snap)
    const u = [ 'exchange', 'ETH', 7000000000 ]

    w.parse(u)

    assert.deepEqual([
      [ 'exchange', 'USD', 97 ],
      [ 'exchange', 'ETH', 99 ]
    ], w.getState())

    w.update(u)

    assert.deepEqual([
      [ 'exchange', 'USD', 97 ],
      [ 'exchange', 'ETH', 70 ]
    ], w.getState())
  })
})
