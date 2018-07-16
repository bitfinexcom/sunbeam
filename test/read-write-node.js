/* eslint-env mocha */

'use strict'

const Sunbeam = require('../index.js')
const assert = require('assert')
const Eos = require('eosjs')

describe('Read/write nodes', () => {
  it('have to be different - empty conf', () => {
    const eos = {
      Eos: Eos,
      readNodeConf: {},
      writeNodeConf: {}
    }

    const sunbeamConf = { account: 'testuser1234' }
    assert.throws(() => { return new Sunbeam(eos, sunbeamConf) })
  })

  it('have to be different - trailing slashes', () => {
    const eos = {
      Eos: Eos,
      readNodeConf: { httpEndpoint: 'http://127.0.0.1:8888' },
      writeNodeConf: { httpEndpoint: 'http://127.0.0.1:8888/' }
    }

    const sunbeamConf = { account: 'testuser1234' }
    assert.throws(() => { return new Sunbeam(eos, sunbeamConf) })
  })

  it('have to be different - different ports', () => {
    const eos = {
      Eos: Eos,
      readNodeConf: { httpEndpoint: 'http://127.0.0.1:1337' },
      writeNodeConf: { httpEndpoint: 'http://127.0.0.1:8888' }
    }

    const sunbeamConf = { account: 'testuser1234' }
    assert.doesNotThrow(() => { return new Sunbeam(eos, sunbeamConf) })
  })
})
