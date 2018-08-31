'use strict'

const {
  Wallet
} = require('.') // require('sunbeam')

;(() => {
  console.log('==== example wallet, managed state ====')
  // simulate msg from api - snapshot
  const msg1 = [ '0',
    'ws',
    [ [ 'exchange', 'USD', 46940000000 ],
      [ 'exchange', 'ETH', 10000000000 ],
      [ 'exchange', 'EUR', 10000000000 ],
      [ 'exchange', 'EOS', 10000000000 ],
      [ 'exchange', 'BTC', 9900000000 ] ] ]

  const snap = msg1[2]
  const w = new Wallet()
  w.update(snap)

  console.log('wallet:')
  console.log(w.getState())

  // simulate msg from api - update
  const msg2 = [ '0', 'wu', [ 'exchange', 'USD', 59812609000, 'testuser1554' ] ]
  const update = msg2[2]
  w.update(update)
  console.log('updated wallet:')
  console.log(w.getState())

  console.log('==== end example wallet, managed state ==== ')
  console.log('')
})()

;(() => {
  console.log('== example wallet, managed state, decimal format')
  // simulate msg from api - snapshot
  const msg1 = [ '0',
    'ws',
    [ [ 'exchange', 'USD', 46940000000 ],
      [ 'exchange', 'ETH', 10000000000 ],
      [ 'exchange', 'EUR', 10000000000 ],
      [ 'exchange', 'EOS', 10000000000 ],
      [ 'exchange', 'BTC', 9900000000 ] ] ]

  const snap = msg1[2]
  const w = new Wallet({ decimals: 8 })
  w.update(snap)

  console.log('wallet:')
  console.log(w.getState())

  // simulate msg from api - update
  const msg2 = [ '0', 'wu', [ 'exchange', 'USD', 59812609000, 'testuser1554' ] ]
  const update = msg2[2]
  w.update(update)
  console.log('updated wallet:')
  console.log(w.getState())

  console.log('==== end example wallet, managed state with options ====')
  console.log('')
})()

;(() => {
  console.log('==== example wallet, just parsing ====')
  // simulate msg from api - snapshot
  const msg1 = [ '0',
    'ws',
    [ [ 'exchange', 'USD', 46940000000 ],
      [ 'exchange', 'ETH', 10000000000 ],
      [ 'exchange', 'EUR', 10000000000 ],
      [ 'exchange', 'EOS', 10000000000 ],
      [ 'exchange', 'BTC', 9900000000 ] ] ]

  const snap = msg1[2]
  const w = new Wallet({ decimals: 8 })

  console.log('parsed snapshot data:')
  console.log(w.parse(snap))

  console.log('no state managed:', w.getState())

  // simulate msg from api - update
  const msg2 = [ '0', 'wu', [ 'exchange', 'USD', 59812609000, 'testuser1554' ] ]
  const update = msg2[2]

  console.log('parsed update data:')
  console.log(w.parse(update))

  console.log('no state managed:', w.getState())

  console.log('==== end example wallet, just parsing ====')
  console.log('')
})()
