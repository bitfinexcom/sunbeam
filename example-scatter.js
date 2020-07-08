'use strict'

const Sunbeam = require('.')

let ScatterJS = require('scatterjs-core')
if (ScatterJS.default) {
  // package was precompiled for babel es6 modules
  ScatterJS = ScatterJS.default
}

let ScatterEOS = require('scatterjs-plugin-eosjs2')
if (ScatterEOS.default) {
  // package was precompiled for babel es6 modules
  ScatterEOS = ScatterEOS.default
}

ScatterJS.plugins(new ScatterEOS())

const { Api, JsonRpc } = require('eosjs')

// nodejs
const fetch = require('node-fetch')
const { TextDecoder, TextEncoder } = require('util')

const httpEndpoint = 'https://api.eosfinex.com'

const rpc = new JsonRpc(httpEndpoint, { fetch })
const api = new Api({
  rpc,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder()
})

const client = {
  rpc,
  api
}

const conf = {
  urls: {
    priv: 'wss://api.eosfinex.com/ws'
  },
  eos: {
    expireInSeconds: 60 * 60, // 1 hour,
    httpEndpoint, // used to get metadata for signing transactions
    exchangeContract: 'eosfinextest', // exchange contract name
    auth: {
      scatter: {
        ScatterJS,
        appName: 'Eosfinex-Demo-Scatter'
      },
      keys: null
    }
  },
  transform: {
    orderbook: { keyed: true },
    wallet: {},
    orders: { keyed: true }
  }
}

const ws = new Sunbeam(client, conf)
const pair = 'tBTCUSD'
const placedOrders = []

ws.on('message', (m) => {
  console.log(m)
})

ws.on('error', (m) => {
  console.error('ERROR!')
  console.error(m)
})

ws.on('open', async () => {
  console.log(await ws.auth())

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

  /* const { txResult, txData } = await ws.deposit({
    currency: 'BTC',
    amount: '0.687'
  })

  const { txResult, txData } = await ws.withdraw({
    currency: 'BTC',
    amount: '0.02'
  }) */

  // available types: EXCHANGE MARKET, EXCHANGE LIMIT, EXCHANGE STOP, EXCHANGE STOP LIMIT, EXCHANGE TRAILING STOP, EXCHANGE FOK, EXCHANGE IOC
  const order = {
    symbol: pair,
    price: '8100',
    amount: '-0.01',
    type: 'EXCHANGE LIMIT',
    clientId: '1332'
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
