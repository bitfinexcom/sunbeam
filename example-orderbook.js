'use strict'

const {
  Orderbook
} = require('.') // require('sunbeam')

;(() => {
  console.log('==== example orderbook, managed state ====')
  // simulate msg from api - snapshot
  const msg1 = [ 'BTC.USD', [ [ '18446744073709551615', 5200000, 5900 ] ] ]

  const snap = msg1[1]
  const o = new Orderbook()
  o.update(snap)

  console.log('orderbook:')
  console.log(o.getState())

  // simulate msg from api - update
  const msg2 = [ 'BTC.USD', [ '18446744073709551337', 800000, 7000 ] ]
  const update = msg2[1]
  o.update(update)
  console.log('updated orderbook:')
  console.log(o.getState())

  console.log('==== end example orderbook, managed state ==== ')
  console.log('')
})()

;(() => {
  console.log('==== example orderbook, just parsing ====')
  // simulate msg from api - snapshot
  const msg1 = [ 'BTC.USD', [ [ '18446744073709551615', 5200000, 5900 ] ] ]

  const snap = msg1[1]
  const o = new Orderbook({ decimals: 4, keyed: true })

  console.log('parsed snapshot data:')
  console.log(o.parse(snap))

  console.log('no state managed:', o.getState())

  // simulate msg from api - update
  const msg2 = [ 'BTC.USD', [ '18446744073709551337', 800000, 7000 ] ]
  const update = msg2[1]

  console.log('parsed update data:')
  console.log(o.parse(update))

  console.log('no state managed:', o.getState())

  console.log('==== end example orderbook, just parsing ====')
  console.log('')
})()
