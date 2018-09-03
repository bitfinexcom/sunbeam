'use strict'

const Sunbeam = require('./sunbeam-ws.js')
module.exports = (exports = Sunbeam)

exports.Orderbook = require('./managed-ob.js')
exports.Wallet = require('./managed-wallet.js')

try {
  window.Sunbeam = Sunbeam
} catch (e) {}
