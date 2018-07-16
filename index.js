'use strict'

const Sunbeam = require('./lib/sunbeam.js')

try {
  window.Sunbeam = Sunbeam
} catch (e) {}

module.exports = Sunbeam
