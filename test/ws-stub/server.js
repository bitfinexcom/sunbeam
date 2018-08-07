'use strict'

const EventEmitter = require('events')

const debug = require('debug')('bfx:wock')
const WebSocket = require('ws')

class Server extends EventEmitter {
  constructor (opts) {
    super(opts)

    this.port = opts.port
    this.wss = new WebSocket.Server({ port: this.port })
    this.channels = { }

    this.wss.on('connection', (ws) => {
      this.emit('connection', ws)

      this.handleConnection(ws)
    })
  }

  close () {
    this.wss.close()
  }

  connectionHook (ws) {}
  messageHook (ws, msg) {}
  closeHook (ws) {}

  handleConnection (ws) {
    this.connectionHook(ws)

    ws.on('close', () => {
      this.closeHook(ws)
    })

    ws.on('message', (message) => {
      debug('received: %s', message)

      const parsed = JSON.parse(message)
      this.messageHook(ws, parsed)
      this.emit('message', message)
    })
  }
}

module.exports = Server
