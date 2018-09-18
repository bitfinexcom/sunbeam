'use strict'

const Sunbeam = require('.')

const Eos = require('eosjs')
const eos = Eos({
  httpEndpoint: 'http://eosnode.example.com:8888', // used to get metadata for signing transactions
  keyProvider: [],
  verbose: false
})

;(async () => {
  const efinexchangeAbi = await eos.getAbi('efinexchange')
  const efinextetherAbi = await eos.getAbi('efinextether')

  const conf = {
    url: 'wss://eosnode-withws.example.com',
    eos: {
      expireInSeconds: 60 * 60, // 1 hour,
      Eos: Eos,
      httpEndpoint: 'http://eosnode.example.com:8888', // used to get metadata for signing transactions
      keyProvider: [''],
      account: '',
      permission: '@active',
      abis: {
        exchange: efinexchangeAbi.abi,
        token: efinextetherAbi.abi
      }
    },
    transform: {
      orderbook: { keyed: true },
      wallet: {},
      orders: { keyed: true }
    }
  }

  console.log('got abis:', Object.keys(conf.eos.abis))

  const ws = new Sunbeam(conf)

  ws.on('message', (m) => {
    console.log(m)
  })

  ws.on('error', (m) => {
    console.error('ERROR!')
    console.error(m)
  })

  ws.on('open', () => {
    ws.onWallet({}, (wu) => {
      console.log('ws.onWalletUpdate')
      console.log(wu)
    })

    ws.onManagedOrderbookUpdate({ symbol: 'BTC.USD' }, (ob) => {
      console.log('ws.onManagedOrderbookUpdate({ symbol: "BTC.USD" }')
      console.log(ob)
    })

    ws.auth()
    ws.subscribeOrderBook('BTC.USD')

    const order = {
      symbol: 'BTC.USD',
      price: '1',
      amount: '1',
      type: 'EXCHANGE_LIMIT'
    }
    ws.place(order)

    /*
    ws.sweep({
      currency: 'EUR'
    })

    ws.deposit({
      currency: 'EUR',
      amount: '2'
    })
    */
  })

  ws.open()
})()
