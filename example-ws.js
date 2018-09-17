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
    wallet: {},
    orders: { keyed: true }
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

  ws.onTradeUpdate({}, (update) => {
    console.log('ws.onTradeUpdate({}')
    console.log(update)
  })

  ws.onManagedOrdersUpdate({}, (orders) => {
    console.log('ws.onManagedOrdersUpdate')
    console.log(orders)
  })

  // opt-in to wallet updates
  ws.subscribeWallet()

  ws.subscribeOrderBook('BTC.USD')

  // public trade data
  ws.onTrades({ symbol: 'ETH.USD' }, (data) => {
    console.log('ws.onTrades({ symbol: "ETH.USD" }')
    console.log(data)
  })
  ws.subscribeTrades('ETH.USD')

  // subscribe to private order updates
  ws.auth()

  // available types: EXCHANGE_MARKET EXCHANGE_IOC EXCHANGE_LIMIT
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
  console.log('------------ws.getState()')

  console.log(ws.getManagedStateComponent('wallet'))
  console.log('orders')
  console.log(ws.getManagedStateComponent('orders'))
  console.log('books')
  console.log(ws.getManagedStateComponent('books', 'BTC.USD'))

  ws.unSubscribeOrderBook('BTC.USD')
  ws.unSubscribeWallet()
  ws.unSubscribeOrders()

  ws.cancel({
    symbol: 'BTC.USD',
    side: 'bids',
    id: '18446744073709551612',
    clientId: '1536867193329'
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
