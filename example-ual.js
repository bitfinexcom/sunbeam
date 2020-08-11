'use strict'

const Sunbeam = require('.')
const UALPrivateKey = require('./ual-privatekey/PrivateKeyUser')
const config = require('./config/example-ual.config.json')

const env = 'staging'
const opts = config[env]

const fetch = require('node-fetch')

// nodejs
const { Api, JsonRpc } = require('eosjs')
const { TextDecoder, TextEncoder } = require('util')

const rpc = new JsonRpc(opts.eos.httpEndpoint, { fetch })
const api = new Api({
  rpc,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder()
})

const client = {
  rpc,
  api
}

const ualUser = new UALPrivateKey(rpc, opts.auth.ual.accountName, opts.auth.ual.privateKey)
const ws = new Sunbeam(client, {
  ...opts,
  eos: {
    ...opts.eos,
    auth: {
      ual: {
        user: ualUser
      }
    }
  }
})

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
  // or const meta = await ws.requestChainMeta('priv')
  ws.send('priv', { event: 'symbols' })

  ws.subscribePublicTrades(pair)
  ws.subscribeOrderbook(pair)

  setTimeout(() => {
    ws.unsubscribePublicTrades(pair)
    ws.unsubscribeOrderbook(pair)
  }, 3000)

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

  ws.onPublicTrades({}, (data) => {
    console.log('ws.onPublicTrades({})')
    console.log('public trade', data)
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
    price: '11100',
    amount: '-0.01',
    type: 'EXCHANGE LIMIT',
    cid: '1332'
  }

  await ws.place(order)

  setTimeout(() => {
    console.log('state', JSON.stringify(ws.state, null, 2))
    const a = placedOrders[0]
    if (a) {
      ws.cancel({ id: Number(a) })
    }
  }, 4000)
})

ws.open()
