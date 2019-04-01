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
  url: 'wss://api-paper.eosfinex.com/ws/',
  moonbeam: 'https://api-paper.eosfinex.com/rest',
  eos: {
    expireInSeconds: 60 * 60, // 1 hour,
    Eos: Eos,
    httpEndpoint: 'https://api-paper.eosfinex.com', // used to get metadata for signing transactions
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

  ws.onOrderBook({ symbol: 'EOX.PUSDT' }, (ob) => {
    console.log('ws.onOrderBook({ symbol: "EOX.PUSD" }')
    console.log(ob)
  })

  ws.subscribeOrderBook('IQX.USD')

  const order = {
    symbol: 'EOX.PUSD',
    price: '1',
    amount: '1',
    type: 'EXCHANGE_LIMIT'
  }

  const { payload, data } = await ws.place(order)
  ws.cancel({
    symbol: 'EOX.PUSD',
    side: 'bid',
    id: '18446744073709551606',
    clientId: '1540306547501022'
  })

  console.log(payload, data)

/*
  ws.deposit({
    currency: 'EOX',
    amount: '2'
  })

  ws.withdraw({
    currency: 'EOX',
    amount: '0.678'
  })

  ws.sweep({
    currency: 'EOX'
  })
*/
})

ws.open()
