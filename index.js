'use strict'

const Sunbeam = require('./lib/sunbeam-ws.js')

try {
  window.Sunbeam = Sunbeam
} catch (e) {}

module.exports = Sunbeam
