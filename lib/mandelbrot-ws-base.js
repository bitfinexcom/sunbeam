'use strict'

const WebSocket = require('isomorphic-ws')
const EventEmmiter = require('events')

class MandelbrotBase extends EventEmmiter {
  constructor (opts = {
    transform: {},
    url: null
  }) {
    super(opts)

    this.conf = opts
    this.url = opts.url

    this.channels = {}
    this.bookHandlers = {}
    this.infoHandlers = {}
    this.managedHandlers = {}
    this.managedBooks = {}
    this.managedHandlers = {} // onMangedXyUpdate

    const walletOpts = this.conf.transform.wallet

    if (opts.Wallet) this.wallet = new opts.Wallet(walletOpts)
    if (opts.Orderbook) this.Orderbook = opts.Orderbook
  }

  open () {
    const ws = this.ws = new WebSocket(this.url)

    ws.onerror = (err) => {
      this.emit('error', err)
    }

    ws.onopen = () => {
      this.connected = true
      this.emit('open')
    }

    ws.onclose = () => {
      this.connected = false
      this.emit('close')
    }

    ws.onmessage = (msg) => {
      this.handleMessage(msg)
    }
  }

  close () {
    this.ws.close()
  }

  send (msg) {
    const str = JSON.stringify(msg)
    this.ws.send(str)
  }

  subscribeOrderBook (symbol) {
    return this.subscribe('book', { symbol })
  }

  unSubscribeOrderBook (symbol) {
    if (!this.channels['book']) return
    if (!this.channels['book'][symbol]) return

    this.unsubscribe('book', { symbol })

    delete this.channels['book'][symbol]
    delete this.managedBooks[symbol]
  }

  subscribe (channel, opts) {
    const msg = {
      event: 'subscribe',
      channel: channel
    }

    this.send(Object.assign(msg, opts))
  }

  unsubscribe (channel, opts) {
    const msg = {
      event: 'unsubscribe',
      channel: channel
    }

    this.send(Object.assign(msg, opts))
  }

  handleMessage (m) {
    let msg

    try {
      msg = JSON.parse(m.data)
    } catch (e) {
      this.emit('error', 'invalid message:', m)
      return
    }

    this.emit('message', msg)

    if (msg.event) {
      this.handleEventMessage(msg)
      return
    }

    // main channel
    if (Array.isArray(msg) && msg[0] === '0') {
      this.handleInfoMessage(msg)
      return
    }

    if (Array.isArray(msg)) {
      this.handleOrderbookMessage(msg)
    }
  }

  handleEventMessage (msg) {
    const { channel, event, chanId } = msg

    if (event === 'subscribed') {
      if (!this.channels[channel]) {
        this.channels[channel] = {}
      }

      this.channels[channel][chanId] = msg
    }
  }

  handleOrderbookMessage (msg) {
    if (!msg) return

    const [ chanId, data ] = msg

    const { symbol } = this.channels['book'][chanId]
    const tOpts = this.conf.transform.orderbook

    if (!this.managedBooks[symbol]) {
      this.managedBooks[symbol] = new this.Orderbook(tOpts)
    }

    const o = this.managedBooks[symbol]

    o.update(data)
    this.internalOrderbookHandler(data, symbol)

    const handler = this.bookHandlers[symbol]
    if (!handler) return
    handler(o.parse(data))
  }

  getInfoHandlerId (id) {
    if (id === 'ws' || id === 'wu') return 'info-wallet'

    return id
  }

  handleInfoMessage (msg) {
    if (!msg) return

    const id = this.getInfoHandlerId(msg[1])
    const handler = this.infoHandlers[id]

    if (id === 'info-wallet') {
      const wm = msg[2]
      if (handler) handler(this.wallet.parse(wm))

      this.wallet.update(wm)
      this.internalWalletHandler()
    }
  }

  onOrderBook (filter, handler) {
    const { symbol } = filter

    if (!symbol) throw new Error('missing: filter.symbol')

    this.bookHandlers[symbol] = handler
  }

  onWallet (filter, handler) {
    this.infoHandlers['info-wallet'] = handler
  }

  onManagedWalletUpdate (filter, handler) {
    this.managedHandlers['managed-wallets'] = handler
  }

  onManagedOrderbookUpdate (filter, handler) {
    const { symbol } = filter

    const k = 'managed-ob' + symbol
    this.managedHandlers[k] = handler
  }

  internalOrderbookHandler (data, symbol) {
    const k = 'managed-ob' + symbol
    const handler = this.managedHandlers[k]
    if (!handler) return

    handler(this.managedBooks[symbol].getState())
  }

  internalWalletHandler () {
    // emit onManagedWalletUpdate
    const handler = this.managedHandlers['managed-wallets']
    if (!handler) return

    handler(this.wallet.getState())
  }
}

module.exports = MandelbrotBase
