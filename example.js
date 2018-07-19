'use strict'

const Sunbeam = require('./')
const Eos = require('eosjs')

const readNodeConf = {
  httpEndpoint: 'http://localhost:8888',
  keyProvider: [
    '5Kci5UR4h25CM4vCyQMTQy4pzMhqXZ8vnocYJJkm2eQb8cfHsWV'
  ]
}

const writeNodeConf = {
  httpEndpoint: 'http://localhost:8888', // 'http://writenode.example.com'
  keyProvider: [
    '5Kci5UR4h25CM4vCyQMTQy4pzMhqXZ8vnocYJJkm2eQb8cfHsWV'
  ]
}
const eos = {
  Eos,
  readNodeConf,
  writeNodeConf
}

// dev: true allows one node for read and write
const opts = { dev: true, account: 'testuser4321' }
const sb = new Sunbeam(eos, opts)

const order = sb.createOrder({
  symbol: 'BTCUSD',
  price: '2100',
  amount: '-14.99',
  type: 'EXCHANGE_LIMIT',
  clientId: '123'
})

sb.place(order, (err, res) => {
  if (err) throw err

  console.log('placed "sell" order')
  console.log(JSON.stringify(res, null, '  '))
})

const orderBuy = sb.createOrder({
  symbol: 'BTCUSD',
  price: '0.1',
  amount: '0.1',
  type: 'EXCHANGE_LIMIT',
  clientId: '125'
})

sb.place(orderBuy, (err, res) => {
  if (err) throw err

  console.log('placed "buy" order')
  console.log(JSON.stringify(res, null, '  '))
})

// orderbook: bfx api v2 style (keyed)
sb.orderbook('BTCUSD', { transform: true }, (err, res) => {
  if (err) throw err

  console.log('orderbook: bfx api v2 style (keyed)')
  console.log(JSON.stringify(res, null, '  '))
})

// orderbook: raw
sb.orderbook('BTCUSD', {}, (err, res) => {
  if (err) throw err

  console.log('orderbook: raw')
  console.log(JSON.stringify(res, null, '  '))
})

// orders, default account', opts.account - testuser4321
sb.orders('BTCUSD', {}, (err, res) => {
  if (err) throw err

  console.log('orders, default account', opts.account)
  console.log(JSON.stringify(res, null, '  '))
})

// orders, testuser1234
sb.orders('BTCUSD', { user: 'testuser1234' }, (err, res) => {
  if (err) throw err

  console.log('orders, user testuser1234')
  console.log(JSON.stringify(res, null, '  '))
})

sb.orders('BTCUSD', {}, (err, res) => {
  if (err) throw err

  console.log('orders, user testuser4321')
  console.log(JSON.stringify(res, null, '  '))
})

sb.orders('BTCUSD', {}, (err, res) => {
  if (err) throw err
  let id
  let side

  if (res.bids && res.bids.length) {
    id = res.bids[0].id
    side = 'bid'
  }

  if (!id && res.asks && res.asks.length) {
    id = res.asks[0].id
    side = 'ask'
  }

  console.log('cancelling order with id', id, 'side:', side)
  sb.cancel({
    id: id,
    symbol: 'BTCUSD',
    side: side
  }, {}, (err, res) => {
    if (err) throw err

    console.log(JSON.stringify(res, null, '  '))
  })
})

sb.withdraw({
  currency: 'USD',
  amount: '0.678'
}, {}, (err, res) => {
  if (err) throw err

  console.log(JSON.stringify(res, null, '  '))
})

sb.balance((err, res) => {
  if (err) throw err

  console.log(JSON.stringify(res, null, '  '))
})
