'use strict'

const Sunbeam = require('.')

const config = require('./config/example-ws.config.json')
const env = 'staging'
const opts = config[env]

const keys = opts.keys
const httpEndpoint = opts.eos.httpEndpoint

const { Api, JsonRpc } = require('eosjs')
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')

const fetch = require('node-fetch')
const { TextDecoder, TextEncoder } = require('util')

const signatureProvider = new JsSignatureProvider(keys)

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
const ws = new Sunbeam(client, opts)

ws.on('message', (m, t) => {
  console.log('------- msg -----')
  console.log(t, m)
})

ws.on('error', (m) => {
  console.error('ERROR!')
  console.error(m)
})

const pair = 'EOS.USDT'
ws.on('open', async () => {
  // it is required to have read and agreed to our TOS to do trading
  // get the current TOS version from:
  // after reading the TOS, you can find them at the bottom of the page
  // https://www.eosfinex.com/legal/terms/

  const tos = '$CURRENT_TOS'
  ws.acceptTos(tos)

  await ws.auth()

  ws.send('pub', { event: 'chain' })
  ws.send('priv', { event: 'chain' })
  ws.send('pub', { event: 'pairs' })
  ws.send('priv', { event: 'pairs' })

  ws.onOrderbook({ symbol: pair }, (ob) => {
    console.log(`ws.onOrderbook({ symbol: ${pair} })`)
    console.log(ob)
  })

  ws.onManagedOrderbook({ symbol: pair }, (ob) => {
    console.log(`ws.onManagedOrderbook({ symbol: ${pair} })`)
    console.log(ob)

    ws.unsubscribeOrderbook(pair)
  })

  ws.onPublicTrades({}, (data) => {
    console.log('ws.onPublicTrades({})')
    console.log('public trade', data)
  })

  ws.onPublicTrades({ symbol: pair }, (data) => {
    console.log(`ws.onPublicTrades({ symbol: ${pair} })`)
    console.log('public trade', data)
  })

  ws.subscribePublicTrades(pair)
  ws.subscribeOrderbook(pair)

  // requires auth
  ws.onWallet({}, (wu) => {
    console.log('ws.onWallet')
    console.log(wu)
  })

  ws.onManagedWallet({}, (mw) => {
    console.log('ws.onManagedWallet')
    console.log(mw)
  })

  ws.onOrders({}, (data) => {
    console.log('ws.onOrders({})')
    console.log(data)
  })

  // filter enabled
  ws.onOrders({ symbol: pair }, (data) => {
    console.log(`ws.onOrders({ symbol: ${pair} })`)
    console.log(data)
  })

  ws.onManagedOrders({}, (orders) => {
    console.log('ws.onManagedOrdersUpdate')
    console.log(orders)
  })

  ws.onManagedOrders({ symbol: pair }, (orders) => {
    console.log(`ws.onManagedOrders({ symbol: ${pair} }`)
    console.log(orders)
  })

  ws.onPrivateTrades({}, (data) => {
    console.log('ws.onPrivateTrades({})')
    console.log('private trade', data) // emits [ 'ETH.USD', 'te', [ '3', 1537196302500, -0.9, 1 ] ]
  })

  ws.onWallet({}, (wu) => {
    console.log('ws.onWallet')
    console.log(wu)
  })

  ws.onManagedWallet({}, (mw) => {
    console.log('ws.onManagedWallet')
    console.log(mw)
  })

  // subscribe to private order updates, wallet updates and trade updates
  await ws.auth()

  // available types: EXCHANGE_MARKET EXCHANGE_IOC EXCHANGE_LIMIT
  const order = {
    symbol: pair,
    price: '300.5',
    amount: '1.09',
    type: 'EXCHANGE_LIMIT'
    // clientId: '1332'
  }

  ws.place(order)
})

setTimeout(() => {
  console.log('-- ws.state --')
  console.log(ws.state)

  setTimeout(() => {
    ws.unsubscribe('priv', 'wallets', { account: 'testuser1114' })
    ws.unsubscribe('priv', 'reports')
  }, 1000)

  setTimeout(() => {
    ws.subscribeWallet()
  }, 5000)

  ws.cancel({
    symbol: pair,
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
    symbol: pair,
    price: '2300',
    amount: '-14.99',
    type: 'EXCHANGE_LIMIT',
    clientId: '1332'
  }

  ws.place(order)
}, 6000)

ws.open()
