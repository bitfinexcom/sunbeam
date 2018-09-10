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

    this.managedState = {
      orders: opts.Orders ? new opts.Orders() : null,
      books: {}
    }

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
    delete this.managedState['books'][symbol]
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

    if (!this.managedState['books'][symbol]) {
      this.managedState['books'][symbol] = new this.Orderbook(tOpts)
    }

    const o = this.managedState['books'][symbol]

    o.update(data)
    this.internalOrderbookHandler(data, symbol)

    const handler = this.bookHandlers[symbol]
    if (!handler) return
    handler(o.parse(data))
  }

  getInfoHandlerId (id) {
    if (id === 'ws' || id === 'wu') {
      return 'info-wallet'
    }

    if (id === 'os' || id === 'on' ||
      id === 'ou' || id === 'oc') {
      return 'info-orders'
    }

    if (id === 'tu' || id === 'te') {
      return 'info-trades'
    }

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

      return
    }

    if (id === 'info-orders') {
      // general handler - ws.onOrderUpdate({}
      const om = msg[2]
      if (handler) handler(msg)

      // symbol filter applied - ws.onOrderUpdate({ symbol: 'BTC.USD' }
      const symbol = om[3]
      const filteredHandler = this.infoHandlers[id + '-' + symbol]
      if (filteredHandler) filteredHandler(msg)

      this.managedState.orders.update(om)
      this.internalOrdersHandler()
    }

    if (id === 'info-trades') {
      const ot = msg[2]
      if (handler) handler(msg)

      const symbol = ot[1]
      console.log(symbol)
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

  onOrderUpdate (filter, handler) {
    const { symbol } = filter

    const k = symbol ? 'info-orders-' + symbol : 'info-orders'

    this.infoHandlers[k] = handler
  }

  onTradeUpdate (filter, handler) {
    const { symbol } = filter

    const k = symbol ? 'info-trades-' + symbol : 'info-trades'
    this.infoHandlers[k] = handler
  }

  onManagedWalletUpdate (filter, handler) {
    this.managedHandlers['managed-wallets'] = handler
  }

  onManagedOrderbookUpdate (filter, handler) {
    const { symbol } = filter

    const k = 'managed-ob' + symbol
    this.managedHandlers[k] = handler
  }

  onManagedOrdersUpdate (filter, handler) {
    this.managedHandlers['managed-orders'] = handler
  }

  internalOrdersHandler () {
    // emit onManagedWalletUpdate
    const handler = this.managedHandlers['managed-orders']
    if (!handler) return
    if (!this.managedState.orders) return

    handler(this.managedState.orders.getState())
  }

  internalOrderbookHandler (data, symbol) {
    const k = 'managed-ob' + symbol
    const handler = this.managedHandlers[k]
    if (!handler) return

    handler(this.managedState['books'][symbol].getState())
  }

  internalWalletHandler () {
    // emit onManagedWalletUpdate
    const handler = this.managedHandlers['managed-wallets']
    if (!handler) return

    handler(this.wallet.getState())
  }
}

module.exports = MandelbrotBase
