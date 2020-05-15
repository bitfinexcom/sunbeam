/* eslint-env mocha */

'use strict'
const assert = require('assert')

const Sunbeam = require('../')
const Wock = require('./ws-testhelper.js')

const snap = [
  ['18446744073709551615', 5000000, 10000],
  ['1', 5010000, -12000],
  ['2', 5010000, -12000]
]

const snapNew = [
  ['133713371337', 5000000, 10000],
  ['5', 5010000, -12000],
  ['23', 5010000, -12000]
]

describe('managed state - sub unsub, state stays nice', () => {
  it('resets state', (done) => {
    const wss = new Wock({
      port: 8888
    })

    const conf = {
      urls: { pub: 'ws://localhost:8888' },
      eos: {
        expireInSeconds: 60 * 60, // 1 hour,
        httpEndpoint: '',
        keyProvider: [''], //
        account: 'testuser1554',
        auth: {}
      },
      transform: {
        orderbook: { keyed: false },
        wallet: {}
      }
    }
    const sws = new Sunbeam({}, conf)

    let subscriptions = 0
    wss.messageHook = (ws, msg) => {
      const sendDelayedSub = (data) => {
        wss.send(ws, {
          event: 'subscribed',
          channel: 'book',
          chanId: 'tBTCUSD',
          symbol: 'tBTCUSD'
        })

        setTimeout(() => {
          // simulate ob snapshot
          wss.send(ws, [
            'tBTCUSD',
            data
          ])
        }, 50)
      }

      if (msg.event === 'subscribe' && subscriptions === 0) {
        subscriptions++
        sendDelayedSub(snap)
      }

      if (msg.event === 'unsubscribe') {
        subscriptions++

        sws.subscribeOrderbook('tBTCUSD')
        sendDelayedSub(snapNew, 50)
      }
    }

    wss.closeHook = (ws) => {
      wss.close()
    }

    sws.on('open', () => {
      sws.subscribeOrderbook('tBTCUSD')
    })

    let count = 0
    sws.onOrderbook({ symbol: 'tBTCUSD' }, (ob) => {
      if (count === 1) {
        count++
      }

      if (count === 0) {
        assert.deepStrictEqual(ob, snap)
        count++
        sws.unsubscribeOrderbook('tBTCUSD')
      }

      if (count === 2) {
        sws.close()
        done()
      }
    })

    sws.open()
  })
})
