/* eslint-env mocha */

'use strict'

const { decimalPad } = require('../lib/util.js')
const assert = require('assert')

describe('util', () => {
  it('decimalpad supports leading zeros', () => {
    assert.strictEqual(decimalPad('96.88000000', 8), '96.88000000')
  })

  it('decimalpad adds padding', () => {
    assert.strictEqual(decimalPad('96.88', 8), '96.88000000')
  })

  it('decimalpad removes excess padding', () => {
    assert.strictEqual(decimalPad('96.88000000', 3), '96.880')
  })
})
