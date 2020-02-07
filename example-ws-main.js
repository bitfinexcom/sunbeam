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

const ws = new Sunbeam(client, opts)

ws.on('message', (m, t) => {
  console.log('------- msg -----')
  console.log(t, m)
})

ws.on('error', (m) => {
  console.error('ERROR!')
  console.error(m)
})

const pair = 'tEOSUST'
ws.on('open', async () => {
  const tos = 'TOS v1'
  ws.acceptTos(tos)

  await ws.auth()

  const order = {
    symbol: pair,
    price: '1',
    amount: '-0.01',
    type: 'EXCHANGE_LIMIT',
    cid: '1332'
  }

  ws.place(order)
})

ws.open()
