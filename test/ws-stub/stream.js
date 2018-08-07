'use strict'

process.env.DEBUG = 'bfx:*'

const debug = require('debug')('bfx:wock')
const Wock = require('./server.js')

class Server extends Wock {
  connectionHook (ws) {
    debug('new connection!')
  }

  messageHook (ws, msg) {
    debug(msg)
    if (msg.event === 'subscribe') {
      this.handleChannel(ws, msg)
    }
  }

  handleChannel (msg) {
    let c = this.channels[msg.channel]
    if (!c) {
      c = {}
    }

    c[msg.symbol] = true

    if (!this.bookSimulator) {
      this.bookSimulator = {}
    }

    const send = (payload) => {
      ws.send(JSON.stringify(payload))
    }

    simulateRandomOrder(msg.symbol, send)
    this.bookSimulator[msg.symbol] = setInterval(() => {
      simulateRandomOrder(msg.symbol, send)
    }, 2000)
  }

  closeHook (ws) {}
}

function getRandomUser () {
  const set = [
    'testuser4321',
    'testuser4322'
  ]

  const i = Math.floor(Math.random() * set.length)

  return set[i]
}

function simulateRandomOrder (pair, send) {
  const id = Math.floor(Math.random() * (1000 - 0 + 1)) + 0
  const user = getRandomUser()

  simulateEntry(pair, user, id, send)
}

function simulateEntry (pair, user, id, send) {
  const newOrder = {'event': 'new', 'account': user, 'id': id, 'clid': 1417, 'side': 'S', 'pair': pair, 'price': 1010000000000, 'qty': 10000000000}
  const fillOrder = {'event': 'fill', 'account': user, 'id': id, 'clid': 1417, 'side': 'S', 'pair': pair, 'price': 1010000000000, 'qty': 10000000000}
  const cancelOrder = {'event': 'del', 'account': user, 'id': id, 'clid': 1417, 'side': 'S', 'pair': pair}

  send(newOrder)

  const lifetime = Math.floor(Math.random() * (60 * 1000 * 2 - 5000 + 1)) + 5000
  setTimeout(() => {
    if (id % 2 === 0) {
      send(fillOrder)
      return
    }

    send(cancelOrder)
  }, lifetime)
}

const s = new Server({ port: 1338 })
const WebSocket = require('ws')
const ws = new WebSocket('ws://localhost:1338')

ws.on('open', () => {
  ws.send('{ "event": "subscribe", "channel": "book", "symbol": "btc.usd"}')
})

ws.on('message', (msg) => {
  console.log(msg)
})
