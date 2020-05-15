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

const pair = 'tBTCUSD'
const placedOrders = []

ws.on('open', async () => {
  await ws.auth()

  ws.send('priv', { event: 'chain' })

  ws.onOrderbook({ symbol: pair }, (ob) => {
    console.log(`ws.onOrderbook({ symbol: ${pair} })`)
    console.log(ob)
  })

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

    if (!Array.isArray(data[0])) {
      placedOrders.push(data[0])
    }
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
    console.log('private trade', data)
  })

  // available types: EXCHANGE MARKET, EXCHANGE LIMIT, EXCHANGE STOP, EXCHANGE STOP LIMIT, EXCHANGE TRAILING STOP, EXCHANGE FOK, EXCHANGE IOC
  const order = {
    symbol: pair,
    price: '900',
    amount: '-0.01',
    type: 'EXCHANGE LIMIT',
    cid: '1332'
  }

  await ws.place(order)

  setTimeout(() => {
    const a = placedOrders[0]
    if (a) {
      ws.cancel({ id: Number(a) })
    }
  }, 2000)
})

ws.open()
