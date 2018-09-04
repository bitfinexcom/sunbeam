'use strict'

const WebSocket = require('ws')
const EventEmitter = require('events')

class Server extends EventEmitter {
  constructor (opts) {
    super(opts)

    this.port = opts.port
    this.wss = new WebSocket.Server(opts)
    this.channels = {}

    this.wss.on('connection', (ws) => {
      this.emit('connection', ws)

      this.handleConnection(ws)
    })
  }

  close () {
    this.wss.close()
  }

  send (ws, msg) {
    ws.send(JSON.stringify(msg))
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
      const parsed = JSON.parse(message)
      this.messageHook(ws, parsed)
      this.emit('message', message)
    })
  }
}

module.exports = Server
