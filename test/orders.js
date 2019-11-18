/* eslint-env mocha */

'use strict'

const Orders = require('../lib/managed-orders.js')
const assert = require('assert')

const snapMsg = ['0',
  'os',
  [['18446744073709551615',
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
    null],
  ['18446744073709551615',
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
    null]]]

const emptySnapMsg = ['0', 'os', []]

const onMsg = ['0', 'on', [
  '1', null, 1234578910, 'BTC.USD', 1536325337500752,
  1536325337500752, -1.000000, -1.000000, 'LIMIT', null, null, null, 0,
  'ACTIVE', null, null, 500.000000, 0, 0, 0, null, null, null, 0, 0, 0, null, null,
  'API>EFX', null, null, null]]

const onMsgEOS = ['0', 'on', [
  '1', null, 1234578910, 'EOS.USD', 1536325337500752,
  1536325337500752, -1.000000, -1.000000, 'LIMIT', null, null, null, 0,
  'ACTIVE', null, null, 500.000000, 0, 0, 0, null, null, null, 0, 0, 0, null, null,
  'API>EFX', null, null, null]]

const ouMsg = ['0', 'ou', [
  '1', null, 1234578910, 'BTC.USD', 1536325337500612, 1536325337500612,
  -10.000000, -10.000000, 'LIMIT', null, null, null, 0, 'ACTIVE', null, null,
  500.000000, 0, 0, 0, null, null, null, 0, 0, 0, null, null,
  'API>EFX', null, null, null]]

const ocMsg = ['0', 'oc', [
  '1', null, 1234578910, 'BTC.USD', 1547142966504439,
  1547143021501823, 0, 10.99, 'LIMIT', null, null, null, 0, 'fully.filled', null, null,
  3, 0, 0, 0, null, null, null, 0, 0, 0, null, null, 'API>EFX', null, null, null], 1]

describe('orders helper', () => {
  it('takes snapshots', () => {
    const o = new Orders()

    const snap = snapMsg[2]
    o.update(snapMsg)

    assert.strictEqual('18446744073709551615', o.getState()[0][0])
    assert.deepStrictEqual(o.getState(), snap)
  })

  it('takes empty snapshots', () => {
    const o = new Orders()

    o.update(emptySnapMsg)

    assert.deepStrictEqual(o.getState(), [])
  })

  it('update respects pair as ids can be same across pairs', () => {
    const o = new Orders()
    o.update(snapMsg)
    o.update(onMsgEOS)

    const snap = snapMsg[2]
    assert.deepStrictEqual(o.getState(), [snap[0], snap[1], onMsgEOS[2]])
  })

  it('update on - new order', () => {
    const o = new Orders()
    o.update(snapMsg)
    o.update(onMsg)

    const snap = snapMsg[2]
    assert.deepStrictEqual(o.getState(), [snap[0], snap[1], onMsg[2]])
  })

  it('update ou', () => {
    const o = new Orders()
    o.update(snapMsg)

    const snap = snapMsg[2]
    // add order
    o.update(onMsg)
    assert.deepStrictEqual(o.getState(), [snap[0], snap[1], onMsg[2]])

    // update it
    o.update(ouMsg)
    assert.deepStrictEqual(o.getState(), [snap[0], snap[1], ouMsg[2]])
  })

  it('update oc', () => {
    const o = new Orders()
    o.update(snapMsg)

    const snap = snapMsg[2]
    // add order
    o.update(onMsg)
    assert.deepStrictEqual(o.getState(), [snap[0], snap[1], onMsg[2]])

    // delete it
    o.update(ocMsg)

    assert.deepStrictEqual(o.getState(), [snap[0], snap[1]])
  })

  it('update oc, mark deleted', () => {
    const o = new Orders({ markDeleted: true })
    o.update(snapMsg)

    const snap = snapMsg[2]
    // add order
    o.update(onMsg)
    assert.deepStrictEqual(o.getState(), [snap[0], snap[1], onMsg[2]])
    assert.strictEqual(o.getState().length, 3)

    // delete it
    o.update(ocMsg)

    const marked = o.getState()[2]
    assert.strictEqual(marked.pop(), 'deleted')

    assert.strictEqual(o.getState()[1].pop(), null) // nothing added to other msg
    assert.strictEqual(o.getState().length, 3)
  })

  it('supports keyed format, snaps', () => {
    const o = new Orders({ keyed: true })
    o.update(snapMsg)

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
    o.update(snapMsg)

    const on = onMsg
    o.update(on)

    assert.strictEqual(o.getState().length, 3)
    const exp = {
      id: '1',
      clientId: 1234578910,
      symbol: 'BTC.USD',
      amount: -1,
      origAmount: -1,
      type: 'LIMIT',
      status: 'ACTIVE',
      price: 500
    }

    assert.deepStrictEqual(o.getState()[2], exp)
  })

  it('supports keyed format, update', () => {
    const o = new Orders({ keyed: true })
    o.update(snapMsg)
    o.update(onMsg)

    assert.strictEqual(o.getState().length, 3)
    const exp = {
      id: '1',
      clientId: 1234578910,
      symbol: 'BTC.USD',
      amount: -1,
      origAmount: -1,
      type: 'LIMIT',
      status: 'ACTIVE',
      price: 500
    }

    assert.deepStrictEqual(o.getState()[2], exp)

    // update
    o.update(ouMsg)

    const expUpdt = {
      id: '1',
      clientId: 1234578910,
      symbol: 'BTC.USD',
      amount: -10,
      origAmount: -10,
      type: 'LIMIT',
      status: 'ACTIVE',
      price: 500
    }

    assert.deepStrictEqual(o.getState()[2], expUpdt)
    assert.strictEqual(o.getState().length, 3)
  })

  it('supports keyed format, delete', () => {
    const o = new Orders({ keyed: true })
    o.update(snapMsg)
    o.update(onMsg)

    assert.strictEqual(o.getState().length, 3)
    o.update(ocMsg)

    const state = o.getState()
    assert.deepStrictEqual(
      ['18446744073709551615', '18446744073709551615'],
      [state[0].id, state[1].id]
    )
    assert.strictEqual(o.getState().length, 2)
  })

  it('supports keyed format, delete', () => {
    const o = new Orders({ keyed: true, markDeleted: true })
    o.update(snapMsg)
    o.update(onMsg)

    assert.strictEqual(o.getState().length, 3)
    o.update(ocMsg)

    const state = o.getState()
    assert.strictEqual(state[0].deleted, undefined)
    assert.strictEqual(state[1].deleted, undefined)
    assert.strictEqual(state[2].deleted, true)
  })
})
