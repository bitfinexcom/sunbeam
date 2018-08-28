'use strict'

const WebSocket = require('isomorphic-ws')
const EventEmmiter = require('events')

class MandelbrotBase extends EventEmmiter {
  constructor (opts = {
    transform: false,
    url: null
  }) {
    super(opts)

    this.conf = opts
    this.url = opts.url

    this.channels = {}
    this.bookHandlers = {}
  }

  open () {
    const ws = this.ws = new WebSocket(this.url, {})

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

  subscribe (channel, opts) {
    const msg = {
      event: 'subscribe',
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
    const [ chanId ] = msg
    const { symbol } = this.channels['book'][chanId]
    const handler = this.bookHandlers[symbol]

    if (msg && msg[1] === 'os') {
      // snapshot
      handler(msg[2])
      return
    }

    handler(msg[1])
  }

  onOrderBook (filter, handler) {
    const { symbol } = filter

    if (!symbol) throw new Error('missing: filter.symbol')
    if (this.bookHandlers[symbol]) throw new Error('handler already registered')

    this.bookHandlers[symbol] = handler
  }
}

module.exports = MandelbrotBase
