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

const httpEndpoint = '__INSERT__ENDPOINT__'

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
    priv: '__INSERT_ENDPOINT__'
  },
  eos: {
    expireInSeconds: 60 * 60, // 1 hour,
    httpEndpoint, // used to get metadata for signing transactions
    tokenContract: 'eosio.token', // Paper sidechain token contract
    exchangeContract: 'eosfinex', // Paper sidechain exchange contract
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
ws.on('message', (m) => {
  console.log(m)
})

ws.on('error', (m) => {
  console.error('ERROR!')
  console.error(m)
})

ws.on('open', async () => {
  const tos = 'TOS v1'
  ws.acceptTos(tos)
  await ws.auth()

  const order = {
    symbol: pair,
    price: '1',
    amount: '-0.01',
    type: 'EXCHANGE LIMIT',
    clientId: '1332'
  }

  const { payload, data } = await ws.place(order)
})

ws.open()
