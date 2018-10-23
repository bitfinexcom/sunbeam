'use strict'

// this is a helper class for signing transactions
// if abis are not passed via constuctor, it depends on initial http calls
// to get contract abis from an eos node.

let URL
if (typeof window === 'undefined') {
  URL = require('url').URL
}

class SignHelper {
  constructor (opts) {
    this.conf = opts

    this.metaEos = null

    // abis needed to construct the tx data
    const abis = {
      exchange: null,
      token: null
    }

    const eos = this.conf.eos
    this.abis = eos.abis || abis

    this.checkAuthOptions()
    this.initMetaEos()
  }

  checkAuthOptions (eos) {
    const { auth } = this.conf.eos
    if (auth.scatter && auth.keys) {
      throw new Error(
        'auth must be scatter or keys based, not both. check auth options.'
      )
    }
  }

  initMetaEos () {
    return new Promise((resolve) => {
      const { Eos, httpEndpoint } = this.conf.eos

      if (this.metaEos && this.exchangeAbi && this.tokenAbi) {
        return resolve()
      }

      this.metaEos = Eos({
        httpEndpoint,
        keyProvider: [],
        verbose: false
      })

      if (this.abis.exchange && this.abis.token) {
        return resolve()
      }

      this.getAbis().then(resolve)
    })
  }

  getExchangeAbi () {
    return new Promise((resolve) => {
      if (this.abis.exchange) return resolve()

      this.metaEos.getAbi('efinexchange').then((res) => {
        this.abis.exchange = res.abi
        resolve()
      })
        .catch((err) => {
          console.error('error while fetching exchange abi for signing')
          throw err
        })
    })
  }

  getTokenAbi () {
    return new Promise((resolve) => {
      if (this.abis.token) return resolve()

      this.metaEos.getAbi('efinextether').then((res) => {
        this.abis.token = res.abi
        resolve()
      })
        .catch((err) => {
          console.error('error while fetching token abi for signing')
          throw err
        })
    })
  }

  getAbis () {
    return Promise.all([
      this.getExchangeAbi(),
      this.getTokenAbi()
    ])
  }

  getTxHeaders (meta, opts) {
    const { expireInSeconds } = opts

    const [
      headBlockTime,
      lastIrreversibleBlockNumber,
      chainId,
      refBlockPrefix
    ] = meta

    let expiration = new Date(+headBlockTime * 1000 + (expireInSeconds * 1000))
    expiration = expiration.toISOString().split('.')[0]

    const transactionHeaders = {
      expiration,
      ref_block_num: lastIrreversibleBlockNumber & 0xFFFF,
      ref_block_prefix: +refBlockPrefix
    }

    return [ transactionHeaders, chainId ]
  }

  prepareSign (meta) {
    const { expireInSeconds } = this.conf.eos
    const [ transactionHeaders, chainId ] = this.getTxHeaders(meta, { expireInSeconds })

    const { Eos, auth, httpEndpoint } = this.conf.eos

    if (auth.keys) {
      const signingEos = Eos({
        httpEndpoint: null,
        chainId,
        keyProvider: auth.keys.keyProvider,
        transactionHeaders,
        broadcast: false,
        verbose: false,
        sign: true
      })

      return signingEos
    }

    const parsed = new URL(httpEndpoint)
    const network = {
      blockchain: 'eos',
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.hostname,
      port: parsed.port,
      chainId: chainId
    }

    const scatter = auth.scatter.ScatterJS.scatter
    const signingEos = Eos({
      httpEndpoint: null,
      chainId,
      transactionHeaders,
      signProvider: scatter.eosHook(network),
      broadcast: false,
      verbose: false,
      sign: true
    })

    return signingEos
  }

  fixTx (transfer) {
    // https://github.com/EOSIO/eosjs/issues/319
    const tx = transfer.transaction
    const fixed = tx.transaction
    fixed.signatures = tx.signatures

    return fixed
  }

  signTx (payload, auth, action, meta) {
    return new Promise(async (resolve, reject) => {
      try {
        const signingEos = this.prepareSign(meta)

        signingEos.fc.abiCache.abi('efinexchange', this.abis.exchange)
        const contract = await signingEos.contract('efinexchange')

        const { authorization } = auth

        const transfer = await contract[action](payload, authorization)
        const fixed = this.fixTx(transfer)

        resolve(fixed)
      } catch (e) {
        reject(e)
      }
    })
  }

  signDeposit (payload, auth, meta) {
    return new Promise(async (resolve, reject) => {
      try {
        const signingEos = this.prepareSign(meta)

        signingEos.fc.abiCache.abi('efinextether', this.abis.token)
        const contract = await signingEos.contract('efinextether')

        const { authorization } = auth
        const transfer = await contract.transfer(payload, authorization)
        const fixed = this.fixTx(transfer)

        resolve(fixed)
      } catch (e) {
        reject(e)
      }
    })
  }
}

module.exports = SignHelper
