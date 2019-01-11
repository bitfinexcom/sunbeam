'use strict'

const {
  Orders
} = require('.') // require('sunbeam')

;(() => {
  console.log('==== example order list, managed state ====')
  // simulate msg from api - snapshot
  const msg1 = [ '0',
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

  const snap = msg1
  const o = new Orders()
  o.update(snap)

  console.log('orders:')
  console.log(o.getState())

  // let's add a new order
  const onMsg = ['0', 'on', [
    '1', null, 1234578910, 'BTC.USD', 1536325337500752,
    1536325337500752, -1.000000, -1.000000, 'LIMIT', null, null, null, 0,
    'ACTIVE', null, null, 500.000000, 0, 0, 0, null, null, null, 0, 0, 0, null, null,
    'API>EFX', null, null, null ]]

  o.update(onMsg)

  console.log('updated orders 1:')
  console.log(o.getState())

  // lets update the just added order (same pair, same client Id)
  const ouMsg = ['0', 'ou', [
    '1', null, 1234578910, 'BTC.USD', 1536325337500612, 1536325337500612,
    -10.000000, -10.000000, 'LIMIT', null, null, null, 0, 'ACTIVE', null, null,
    500.000000, 0, 0, 0, null, null, null, 0, 0, 0, null, null,
    'API>EFX', null, null, null]]

  const update = ouMsg
  o.update(update)
  console.log('updated orders 2:')
  console.log(o.getState())

  console.log('==== end example orders, managed state ==== ')
  console.log('')
})()
