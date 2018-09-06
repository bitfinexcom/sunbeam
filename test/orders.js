/* eslint-env mocha */

'use strict'

const Orders = require('../lib/managed-orders.js')
const assert = require('assert')

const snapMsg = [ '0',
  'os',
  [ [ '18446744073709551615',
      null,
      1536247370903,
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

const ocMsg = ["0","oc",[
  "18446744073709551615",null,12345,"BTC.USD",1536325281501278,
  1536325337500662,0.000000,10.000000,"LIMIT",null,null,null,0,
  "fully.filled",null,null,500.000000,0,0,0,null,null,null,0,0,0,null,null,
  "API>EFX",null,null,null ]]


const onMsg = ["0","on",[
  "1",null,12345,"BTC.USD",1536325337500752,
  1536325337500752,-1.000000,-1.000000,"LIMIT",null,null,null,0,
  "ACTIVE",null,null,500.000000,0,0,0,null,null,null,0,0,0,null,null,
  "API>EFX",null,null,null ]]

const ouMsg = ["0","ou",[
  "1",null,1337,"BTC.USD",1536325337500612,1536325337500612,
  -10.000000,-10.000000,"LIMIT",null,null,null,0,"ACTIVE",null,null,
  500.000000,0,0,0,null,null,null,0,0,0,null,null,
  "API>EFX",null,null,null]]

describe('orders helper', () => {
  it('takes snapshots', () => {
    const o = new Orders()

    const snap = snapMsg[2]
    o.update(snap)

    assert.equal('18446744073709551615', o.getState()[0][0])
    assert.deepEqual(o.getState(), snap)
  })

  it('takes empty snapshots', () => {
    const o = new Orders()

    const snap = emptySnapMsg[2]
    o.update(snap)

    assert.deepEqual(o.getState(), [])
  })

  it('update respect pair as ids can be same across pairs', () => {
    const o = new Orders()
    const snap = snapMsg[2]
    o.update(snap)

    const oc = ocMsg[2]
    o.update(oc)

    assert.deepEqual(o.getState(), [ oc, snap[1] ])
  })

  it('update on - new order', () => {
    const o = new Orders()
    const snap = snapMsg[2]
    o.update(snap)

    const on = onMsg[2]
    o.update(on)

    assert.deepEqual(o.getState(), [ snap[0], snap[1], on ])
  })

  it('update ou', () => {
    const o = new Orders()
    const snap = snapMsg[2]
    o.update(snap)

    // add order
    const on = onMsg[2]
    o.update(on)
    assert.deepEqual(o.getState(), [ snap[0], snap[1], on ])

    // update it
    const ou = ouMsg[2]
    o.update(ou)
    assert.deepEqual(o.getState(), [ snap[0], snap[1], ou ])
  })
})
