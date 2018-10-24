'use strict'

const Sunbeam = require('.')
const Eos = require('eosjs')

let ScatterJS = require('scatterjs-core')
if (ScatterJS.default) {
  // package was precompiled for babel es6 modules
  ScatterJS = ScatterJS.default
}

let ScatterEOS = require('scatterjs-plugin-eosjs')
if (ScatterEOS.default) {
  // package was precompiled for babel es6 modules
  ScatterEOS = ScatterEOS.default
}

ScatterJS.plugins(new ScatterEOS())

const conf = {
  url: 'wss://eosnode-withws.example.com',
  eos: {
    expireInSeconds: 60 * 60, // 1 hour,
    Eos: Eos,
    httpEndpoint: 'http://eosnode.example.com:8888', // used to get metadata for signing transactions
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

const ws = new Sunbeam(conf)

ws.on('message', (m) => {
  console.log(m)
})

ws.on('error', (m) => {
  console.error('ERROR!')
  console.error(m)
})

ws.on('open', async () => {
  console.log(await ws.auth())
  console.log(await ws.auth()) // cached

  ws.onOrderBook({ symbol: 'IQX.USD' }, (ob) => {
    console.log('ws.onOrderBook({ symbol: "IQX.USD" }')
    console.log(ob)
  })

  ws.subscribeOrderBook('IQX.USD')

  const order = {
    symbol: 'IQX.USD',
    price: '1',
    amount: '1',
    type: 'EXCHANGE_LIMIT'
  }

  const { payload, data } = await ws.place(order)
  ws.cancel({
    symbol: 'IQX.USD',
    side: 'bid',
    id: '18446744073709551606',
    clientId: '1540306547501022'
  })

/*
  ws.deposit({
    currency: 'EOS',
    amount: '2'
  })

  ws.withdraw({
    currency: 'EOS',
    amount: '0.678'
  })

  ws.sweep({
    currency: 'EOS'
  })
*/
})

ws.open()
