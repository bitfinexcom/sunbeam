'use strict'

const Sunbeam = require('./sunbeam-ws.js')
module.exports = (exports = Sunbeam)

exports.Orderbook = require('./managed-ob.js')
exports.Wallet = require('./managed-wallet.js')
exports.Orders = require('./managed-orders.js')
