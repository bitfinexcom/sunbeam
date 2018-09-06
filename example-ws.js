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
    account: '',
    permission: '@active'
  },
  transform: {
    orderbook: { keyed: true },
    wallet: {}
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

  ws.onWallet({}, (wu) => {
    console.log('ws.onWalletUpdate')
    console.log(wu)
  })

  ws.onManagedWalletUpdate({}, (mw) => {
    console.log('ws.onManagedWalletUpdate')
    console.log(mw)
  })

  ws.onManagedOrderbookUpdate({ symbol: 'BTC.USD' }, (ob) => {
    console.log('ws.onManagedOrderbookUpdate({ symbol: "BTC.USD" }')
    console.log(ob)
  })

  // emits all updates
  ws.onOrderUpdate({}, (data) => {
    console.log('ws.onOrderUpdate({}')
    console.log(data)
  })

  // filter enabled
  ws.onOrderUpdate({ symbol: 'BTC.USD' }, (data) => {
    console.log('ws.onOrderUpdate({ symbol: "BTC.USD" }')
    console.log(data)
  })

  ws.onOrderUpdate({ symbol: 'ETH.USD' }, (data) => {
    console.log('ws.onOrderUpdate({ symbol: "ETH.USD" }')
    console.log(data)
  })

  // opt-in to wallet updates
  ws.subscribeWallet()

  ws.subscribeOrderBook('BTC.USD')

  // subscribe to private order updates
  ws.auth()

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
  ws.unSubscribeOrderBook('BTC.USD')
  ws.unSubscribeWallet()

  ws.cancel({
    symbol: 'BTC.USD',
    id: '1'
  })

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
