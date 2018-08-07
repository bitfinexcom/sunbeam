'use strict'

const WebSocket = require('isomorphic-ws')
const EventEmitter = require('events')

class Sunbeam extends EventEmitter {
  constructor (eos, sunbeamConf = {}) {
    super(eos, sunbeamConf)

    const { eosNode } = eos

    this.eosNode = eosNode
    this.connected = false
    this.channels = {}
    this.transformOb = sunbeamConf.transformOb
  }

  open () {
    const ws = this.ws = new WebSocket(this.eosNode, {})

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

  send (msg) {
    this.ws.send(JSON.stringify(msg))
  }

  handleMessage (msg) {
    const payload = JSON.parse(msg.data)
    this.emit('message', payload)

    const isOrderbook = () => ['fill', 'new', 'del'].includes(payload.event)
    if (isOrderbook(payload)) {
      const res = this.maybeTransform(payload)
      this.emit('order', res)
    }
  }

  orderbook (pair) {
    if (!this.connected) {
      throw new Error('no connection to server')
    }

    const book = pair.toLowerCase()
    this.send({ 'event': 'subscribe', 'channel': 'book', 'symbol': book })
  }

  maybeTransform (payload) {
    if (!this.transformOb) return payload

    const res = {
      orderID: +payload.id,
      price: +payload.price,
      amount: +payload.qty
    }

    if (payload.side === 'S') {
      res.amount = +('-' + payload.qty)
    }

    return res
  }
}

module.exports = Sunbeam
