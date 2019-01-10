'use strict'

const MB = require('mandelbrot')
const Sunbeam = require('./sunbeam-ws.js')
module.exports = (exports = Sunbeam)

exports.Orderbook = MB.R0Orderbook
exports.Wallet = MB.BaseWallet
exports.Orders = require('./managed-orders.js')
