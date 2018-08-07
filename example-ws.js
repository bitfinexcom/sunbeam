'use strict'

const Sunbeam = require('./lib/sunbeam-ws.js')
const sb = new Sunbeam(
  { eosNode: 'ws://localhost:1338' },
  { transformOb: true }
)

sb.on('open', () => {
  sb.orderbook('BTC.USD')
})

sb.on('error', (err) => {
  console.error('sunbeam error!')
  console.error(err)
})

sb.on('order', (order) => {
  console.log(order)
})

sb.open()
