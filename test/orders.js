/* eslint-env mocha */

'use strict'

const Orders = require('../lib/managed-orders.js')
const assert = require('assert')

const snapMsg = [ '0',
  'os',
  [ [ '18446744073709551615',
    null,
    12345,
    'BTC.USD',
    1536247373000987,
    1536247378501049,
    0.9,
    1,
    'LIMIT',
    null,
    null,
    null,
    0,
    'PARTIALLY FILLED',
    null,
    null,
    1,
    0,
    0,
    0,
    null,
    null,
    null,
    0,
    0,
    0,
    null,
    null,
    'API>EFX',
    null,
    null,
    null ],
  [ '18446744073709551615',
    null,
    1536247370903,
    'ETH.USD',
    1536247373000987,
    1536247378501049,
    0.9,
    1,
    'LIMIT',
    null,
    null,
    null,
    0,
    'PARTIALLY FILLED',
    null,
    null,
    1,
    0,
    0,
    0,
    null,
    null,
    null,
    0,
    0,
    0,
    null,
    null,
    'API>EFX',
    null,
    null,
    null ] ] ]

const emptySnapMsg = [ '0', 'os', [] ]

const ocMsg = ['0', 'oc', [
  '18446744073709551615', null, 12345, 'BTC.USD', 1536325281501278,
  1536325337500662, 0.000000, 10.000000, 'LIMIT', null, null, null, 0,
  'fully.filled', null, null, 500.000000, 0, 0, 0, null, null, null, 0, 0, 0, null, null,
  'API>EFX', null, null, null ]]

const onMsg = ['0', 'on', [
  '1', null, 1234578910, 'BTC.USD', 1536325337500752,
  1536325337500752, -1.000000, -1.000000, 'LIMIT', null, null, null, 0,
  'ACTIVE', null, null, 500.000000, 0, 0, 0, null, null, null, 0, 0, 0, null, null,
  'API>EFX', null, null, null ]]

const ouMsg = ['0', 'ou', [
  '1', null, 1234578910, 'BTC.USD', 1536325337500612, 1536325337500612,
  -10.000000, -10.000000, 'LIMIT', null, null, null, 0, 'ACTIVE', null, null,
  500.000000, 0, 0, 0, null, null, null, 0, 0, 0, null, null,
  'API>EFX', null, null, null]]

describe('orders helper', () => {
  it('takes snapshots', () => {
    const o = new Orders()

    const snap = snapMsg[2]
    o.update(snap)

    assert.strictEqual('18446744073709551615', o.getState()[0][0])
    assert.deepStrictEqual(o.getState(), snap)
  })

  it('takes empty snapshots', () => {
    const o = new Orders()

    const snap = emptySnapMsg[2]
    o.update(snap)

    assert.deepStrictEqual(o.getState(), [])
  })

  it('update respect pair as ids can be same across pairs', () => {
    const o = new Orders()
    const snap = snapMsg[2]
    o.update(snap)

    const oc = ocMsg[2]
    o.update(oc)

    assert.deepStrictEqual(o.getState(), [ oc, snap[1] ])
  })

  it('update on - new order', () => {
    const o = new Orders()
    const snap = snapMsg[2]
    o.update(snap)

    const on = onMsg[2]
    o.update(on)

    assert.deepStrictEqual(o.getState(), [ snap[0], snap[1], on ])
  })

  it('update ou', () => {
    const o = new Orders()
    const snap = snapMsg[2]
    o.update(snap)

    // add order
    const on = onMsg[2]
    o.update(on)
    assert.deepStrictEqual(o.getState(), [ snap[0], snap[1], on ])

    // update it
    const ou = ouMsg[2]
    o.update(ou)
    assert.deepStrictEqual(o.getState(), [ snap[0], snap[1], ou ])
  })

  it('supports keyed format, snaps', () => {
    const o = new Orders({ keyed: true })
    const snap = snapMsg[2]
    o.update(snap)

    const exp = {
      id: '18446744073709551615',
      clientId: 12345,
      symbol: 'BTC.USD',
      amount: 0.9,
      origAmount: 1,
      type: 'LIMIT',
      status: 'PARTIALLY FILLED',
      price: 1
    }

    assert.deepStrictEqual(o.getState()[0], exp)
  })

  it('supports keyed format, new order', () => {
    const o = new Orders({ keyed: true })
    const snap = snapMsg[2]
    o.update(snap)

    const on = onMsg[2]
    o.update(on)

    assert.strictEqual(o.getState().length, 3)
    const exp = {
      'id': '1',
      'clientId': 1234578910,
      'symbol': 'BTC.USD',
      'amount': -1,
      'origAmount': -1,
      'type': 'LIMIT',
      'status': 'ACTIVE',
      'price': 500
    }

    assert.deepStrictEqual(o.getState()[2], exp)
  })

  it('supports keyed format, update', () => {
    const o = new Orders({ keyed: true })
    const snap = snapMsg[2]
    o.update(snap)

    const on = onMsg[2]
    o.update(on)

    assert.strictEqual(o.getState().length, 3)
    const exp = {
      'id': '1',
      'clientId': 1234578910,
      'symbol': 'BTC.USD',
      'amount': -1,
      'origAmount': -1,
      'type': 'LIMIT',
      'status': 'ACTIVE',
      'price': 500
    }

    assert.deepStrictEqual(o.getState()[2], exp)

    // update
    const ou = ouMsg[2]
    o.update(ou)

    const expUpdt = {
      'id': '1',
      'clientId': 1234578910,
      'symbol': 'BTC.USD',
      'amount': -10,
      'origAmount': -10,
      'type': 'LIMIT',
      'status': 'ACTIVE',
      'price': 500
    }

    assert.deepStrictEqual(o.getState()[2], expUpdt)
    assert.strictEqual(o.getState().length, 3)
  })
})
