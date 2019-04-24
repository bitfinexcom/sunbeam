'use strict'

// taken from https://github.com/EOSIO/eosjs/blob/v16.0.9/src/format.js
// MIT license
exports.decimalPad = decimalPad
function decimalPad (num, precision) {
  const value = num + ''

  if (!precision) {
    return value
  }
  if (precision <= 0 && precision >= 18) {
    throw new Error('Precision should be 18 characters or less')
  }

  const part = value.split('.')
  if (precision === 0 && part.length === 1) {
    return part[0]
  }

  if (part.length === 1) {
    return `${part[0]}.${'0'.repeat(precision)}`
  }

  const pad = precision - part[1].length
  if (pad <= 0) {
    throw new Error('decimal exceeds precision')
  }

  return `${part[0]}.${part[1]}${'0'.repeat(pad)}`
}
