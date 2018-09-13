'use strict'

const WebSocket = require('isomorphic-ws')
const EventEmitter = require('events')

const Wallet = require('./managed-wallet.js')
const Orderbook = require('./managed-ob.js')
const Orders = require('./managed-orders.js')

class MandelbrotBase extends EventEmitter {
  constructor (opts) {
    super()

    const defaults = {
      Wallet,
      Orderbook,
      Orders,

      transform: {
        orderbook: { keyed: true },
        orders: { keyed: true },
        wallet: {}
      }
    }

    const conf = {
      ...defaults,
      ...opts
    }

    this.conf = conf
    this.url = conf.url

    this._channels = {}
    this._bookHandlers = {}
    this._infoHandlers = {}
    this._managedHandlers = {}

    const tConf = conf.transform
    this._managedState = {
      orders: conf.Orders ? new conf.Orders(tConf.orders) : null,
      books: {},
      wallet: conf.Wallet ? new conf.Wallet(tConf.wallet) : null
    }

    this._managedHandlers = {} // onMangedXyUpdate

    if (conf.Orderbook) this._Orderbook = conf.Orderbook
  }

  auth () {}
  withdraw () {}
  cancel () {}
  place () {}

  getManagedStateComponent (type, symbol) {
    if (type === 'wallet') {
      return this._managedState.wallet
    }

    if (type === 'books') {
      if (!symbol) throw new Error('required: symbol')

      return this._managedState.books[symbol]
    }

    if (type === 'orders') {
      return this._managedState.orders
    }
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
    if (!this._channels['book']) return
    if (!this._channels['book'][symbol]) return

    this.unsubscribe('book', { symbol })

    delete this._channels['book'][symbol]
    delete this._managedState['books'][symbol]
  }

  unSubscribeOrders () {
    this.unsubscribe('reports')
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
      const err = new Error('invalid message, see info and msg prop')
      err.info = e
      err.msg = m.data

      this.emit('error', err)
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
      if (!this._channels[channel]) {
        this._channels[channel] = {}
      }

      this._channels[channel][chanId] = msg
    }
  }

  handleOrderbookMessage (msg) {
    if (!msg) return

    const [ chanId, data ] = msg

    const { symbol } = this._channels['book'][chanId]
    const tOpts = this.conf.transform.orderbook

    if (!this._managedState['books'][symbol]) {
      this._managedState['books'][symbol] = new this._Orderbook(tOpts)
    }

    const o = this._managedState['books'][symbol]

    o.update(data)
    this.internalOrderbookHandler(data, symbol)

    const handler = this._bookHandlers[symbol]
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
    const handler = this._infoHandlers[id]

    if (id === 'info-wallet') {
      const wallet = this._managedState.wallet

      const wm = msg[2]
      if (handler) handler(wallet.parse(wm))

      wallet.update(wm)
      this.internalWalletHandler()

      return
    }

    if (id === 'info-orders') {
      // general handler - ws.onOrderUpdate({}
      const om = msg[2]
      if (handler) handler(msg)

      // symbol filter applied - ws.onOrderUpdate({ symbol: 'BTC.USD' }
      const symbol = om[3]
      const filteredHandler = this._infoHandlers[id + '-' + symbol]
      if (filteredHandler) filteredHandler(msg)

      this._managedState.orders.update(om)
      this.internalOrdersHandler()
    }

    if (id === 'info-trades') {
      if (handler) handler(msg)
    }
  }

  onOrderBook (filter, handler) {
    const { symbol } = filter

    if (!symbol) throw new Error('missing: filter.symbol')

    this._bookHandlers[symbol] = handler
  }

  onWallet (filter, handler) {
    this._infoHandlers['info-wallet'] = handler
  }

  onOrderUpdate (filter, handler) {
    const { symbol } = filter

    const k = symbol ? 'info-orders-' + symbol : 'info-orders'

    this._infoHandlers[k] = handler
  }

  onTradeUpdate (filter, handler) {
    const { symbol } = filter

    const k = symbol ? 'info-trades-' + symbol : 'info-trades'
    this._infoHandlers[k] = handler
  }

  onManagedWalletUpdate (filter, handler) {
    this._managedHandlers['managed-wallets'] = handler
  }

  onManagedOrderbookUpdate (filter, handler) {
    const { symbol } = filter

    const k = 'managed-ob' + symbol
    this._managedHandlers[k] = handler
  }

  onManagedOrdersUpdate (filter, handler) {
    this._managedHandlers['managed-orders'] = handler
  }

  internalOrdersHandler () {
    const handler = this._managedHandlers['managed-orders']
    if (!handler) return
    if (!this._managedState.orders) return

    handler(this._managedState.orders.getState())
  }

  internalOrderbookHandler (data, symbol) {
    const k = 'managed-ob' + symbol
    const handler = this._managedHandlers[k]
    if (!handler) return

    handler(this._managedState['books'][symbol].getState())
  }

  internalWalletHandler () {
    // emit onManagedWalletUpdate
    const handler = this._managedHandlers['managed-wallets']
    if (!handler) return

    const wallet = this._managedState.wallet
    handler(wallet.getState())
  }
}

module.exports = MandelbrotBase
