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
  if (pad < 0) {
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

exports.txToArr = txToArr
function txToArr (eObjOrder) {
  const result = []
  for (const prop of txPropsSeq) {
    // transaction_extensions, context_free_data, context_free_actions
    // are assumed to be empty
    if (prop === 'actions') {
      result.push(actionObjToArr(eObjOrder.actions))
      continue
    }

    if (prop === 'context_free_data') {
      const cfData = eObjOrder[prop] || []
      result.push(cfData)
      continue
    }

    result.push(eObjOrder[prop])
  }

  return result
}

const txPropsSeq = [
  'expiration',
  'ref_block_num',
  'ref_block_prefix',
  'max_net_usage_words',
  'max_cpu_usage_ms',
  'delay_sec',
  'context_free_actions',
  'actions',
  'transaction_extensions',
  'signatures',
  'context_free_data'
]

const actionPropsSeq = [
  'account',
  'name',
  'authorization',
  'data'
]

function actionObjToArr (actions) {
  const result = []
  for (const action of actions) {
    const actArr = []
    for (const prop of actionPropsSeq) {
      if (prop === 'authorization') {
        actArr.push(action.authorization.map(el => [el.actor, el.permission]))
        continue
      }
      actArr.push(action[prop])
    }
    result.push(actArr)
  }
  return result
}
