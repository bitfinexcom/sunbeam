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
  },
  transform: {
    orderbook: { keyed: true, decimals: 4 }
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
  ws.onOrderBook({ symbol: 'BTC.USD' }, (ob) => {
    console.log('ws.onOrderBook({ symbol: "BTC.USD" }')
    console.log(ob)
  })

  ws.onWalletUpdate({}, (wu) => {
    console.log('ws.onWalletUpdate')
    console.log(wu)
  })

  ws.onWalletSnapshot({}, (ws) => {
    console.log('ws.onWalletSnapshot')
    console.log(ws)
  })

  ws.subscribeOrderBook('BTC.USD')
  ws.subscribeWallet()

  const order = {
    symbol: 'BTC.USD',
    price: '2300',
    amount: '-14.99',
    type: 'EXCHANGE_LIMIT',
    clientId: '1332'
  }
  ws.place(order)
})

setTimeout(() => {
  const order = {
    symbol: 'BTC.USD',
    price: '2300',
    amount: '-14.99',
    type: 'EXCHANGE_LIMIT',
    clientId: '1332'
  }
  ws.place(order)
}, 6000)

ws.open()
