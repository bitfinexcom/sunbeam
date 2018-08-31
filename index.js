'use strict'

const Sunbeam = require('./lib/sunbeam-ws.js')
module.exports = (exports = Sunbeam)

exports.Orderbook = require('./lib/managed-ob.js')
exports.Wallet = require('./lib/managed-wallet.js')

try {
  window.Sunbeam = Sunbeam
} catch (e) {}
