'use strict'

const Sunbeam = require('./lib/sunbeam-ws.js')
const Eos = require('eosjs')

const conf = {
  url: '',
  eos: {
    expireInSeconds: 60 * 60, // 1 hour,
    Eos: Eos,

    httpEndpoint: '', // used to get metadata for signing transactions
    keyProvider: [''],
    account: ''
  }
}

const ws = new Sunbeam(conf)

ws.on('message', (m) => {
  console.log(m)
})

ws.on('error', (m) => {
  console.error('ERROR!')
  console.error(m)
})

ws.on('open', () => {
  console.log('opened ws')
  // ws.subscribeOrderBook('BTCUSD')

  const order = {
    symbol: 'BTC.USD',
    price: '2300',
    amount: '-14.99',
    type: 'EXCHANGE_LIMIT',
    clientId: '1332'
  }
  ws.place(order)

  console.log('placed order')
})

ws.onOrderBook({ symbol: 'BTCUSD' }, (ob) => {
  console.log('ob')
  console.log(ob)
})

ws.open()
