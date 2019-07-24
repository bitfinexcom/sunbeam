'use strict'

const Sunbeam = require('.')

const { Api, JsonRpc } = require('eosjs')
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')

const fetch = require('node-fetch')
const { TextDecoder, TextEncoder } = require('util')
const keys = ['SECRET']

const signatureProvider = new JsSignatureProvider(keys)

const httpEndpoint = 'https://api-paper.eosfinex.com'

const rpc = new JsonRpc(httpEndpoint, { fetch })
const api = new Api({
  rpc,
  signatureProvider,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder()
})

const client = {
  rpc,
  api
}

// setup sunbeam
const opts = {
  url: 'wss://api-paper.eosfinex.com/ws/',
  moonbeam: 'https://api-paper.eosfinex.com/rest',
  eos: {
    expireInSeconds: 60 * 60, // 1 hour,
    httpEndpoint: httpEndpoint, // used to get metadata for signing transactions
    tokenContract: 'eosio.token', // Paper sidechain token contract
    exchangeContract: 'eosfinex', // Paper sidechain exchange contract
    auth: {
      keys: {
        account: '', // accountname to use
        permission: 'active'
      },
      scatter: null
    }
  },
  transform: {
    orderbook: { keyed: true },
    wallet: {},
    orders: { keyed: true }
  }
}

const ws = new Sunbeam(client, opts)

ws.on('message', (m) => {
  console.log(m)
})

ws.on('error', (m) => {
  console.error('ERROR!')
  console.error(m)
})

ws.on('open', () => {
  // available types: EXCHANGE_MARKET EXCHANGE_IOC EXCHANGE_LIMIT
  const order = {
    symbol: 'EOX.PUSDT',
    price: '300.5',
    amount: '-1.09',
    type: 'EXCHANGE_LIMIT'
    // clientId: '1332'
  }
  ws.place(order)

  ws.onOrderBook({ symbol: 'EOX.PUSDT' }, (ob) => {
    console.log('ws.onOrderBook({ symbol: "EOX.PUSDT" }')
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

  ws.onManagedOrderbookUpdate({ symbol: 'EOX.PUSDT' }, (ob) => {
    console.log('ws.onManagedOrderbookUpdate({ symbol: "EOX.PUSDT" }')
    console.log(ob)
  })

  // emits all updates
  ws.onOrderUpdate({}, (data) => {
    console.log('ws.onOrderUpdate({}')
    console.log(data)
  })

  // filter enabled
  ws.onOrderUpdate({ symbol: 'EOX.PUSDT' }, (data) => {
    console.log('ws.onOrderUpdate({ symbol: "EOX.PUSDT" }')
    console.log(data)
  })

  ws.onOrderUpdate({ symbol: 'EOX.PUSDT' }, (data) => {
    console.log('ws.onOrderUpdate({ symbol: "EOX.PUSDT" }')
    console.log(data)
  })

  ws.onPrivateTradeUpdate({}, (data) => {
    console.log('ws.onPrivateTradeUpdate({} ')
    console.log('private trade', data) // emits [ 'ETH.USD', 'te', [ '3', 1537196302500, -0.9, 1 ] ]
  })

  ws.onPublicTradeUpdate({ symbol: 'EOX.PUSDT' }, (data) => {
    console.log('ws.onPublicTradeUpdate({} ')
    console.log('public trade', data)
  })

  ws.subscribePublicTrades('EOX.PUSDT')

  ws.onManagedOrdersUpdate({}, (orders) => {
    console.log('ws.onManagedOrdersUpdate')
    console.log(orders)
  })

  ws.subscribeOrderBook('EOX.PUSDT')

  const tos = 'tos_version' // read tos and get current version
  ws.acceptTos(tos)

  // subscribe to private order updates, wallet updates and trade updates
  ws.auth()

  ws.requestHistory().then((history) => {
    console.log(history.res)
  })
})

setTimeout(() => {
  console.log('------------ws.getState()')

  console.log(ws.getManagedStateComponent('wallet'))
  console.log('orders')
  console.log(ws.getManagedStateComponent('orders'))
  console.log('books')
  console.log(ws.getManagedStateComponent('books', 'EOX.PUSDT'))

  ws.unSubscribeOrderBook('BTC.USD')
  ws.unSubscribeWallet()
  ws.unSubscribeOrders()

  ws.cancel({
    symbol: 'EOX.PUSDT',
    side: 'bid',
    id: '18446744073709551612',
    clientId: '1536867193329'
  })

  /*
  ws.sweep({
    currency: 'EUR'
  })

  ws.deposit({
    currency: 'EUR',
    amount: '2'
  })
  */

  const order = {
    symbol: 'EOX.PUSDT',
    price: '2300',
    amount: '-14.99',
    type: 'EXCHANGE_LIMIT',
    clientId: '1332'
  }
  ws.place(order)
}, 6000)

ws.open()
