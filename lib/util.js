'use strict'

// taken from https://github.com/EOSIO/eosjs/blob/v16.0.9/src/format.js
// MIT license
exports.decimalPad = decimalPad
function decimalPad (num, precision) {
  const value = decimalString(num)

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

// taken from https://github.com/EOSIO/eosjs/blob/v16.0.9/src/format.js
// MIT license
function decimalString (value) {
  if (!value) throw new Error('value required')

  value = value.toString ? value.toString() : value + ''

  const neg = /^-/.test(value)
  if (neg) {
    value = value.substring(1)
  }

  if (value[0] === '.') {
    value = `0${value}`
  }

  const part = value.split('.')

  if (part.length === 2) {
    part[1] = part[1].replace(/0+$/, '')// remove suffixing zeros
    if (part[1] === '') {
      part.pop()
    }
  }

  part[0] = part[0].replace(/^0*/, '')// remove leading zeros
  if (part[0] === '') {
    part[0] = '0'
  }
  return (neg ? '-' : '') + part.join('.')
}
