'use strict'

const MB = require('mandelbrot')
const Sunbeam = require('./sunbeam-ws.js')
module.exports = (exports = Sunbeam)

exports.Orderbook = require('./managed-ob.js')
exports.Wallet = MB.BaseWallet
exports.Orders = require('./managed-orders.js')
