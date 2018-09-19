'use strict'

// this is a helper class for signing transactions
// if abis are not passed via constuctor, it depends on initial http calls
// to get contract abis from an eos node.

class SignHelper {
  constructor (opts) {
    this.conf = opts

    this.metaEos = null

    // abis needed to construct the tx data
    const abis = {
      exchange: null,
      token: null
    }

    this.abis = this.conf.eos.abis || abis

    this.initMetaEos()
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

  async prepareSign (meta) {
    const { expireInSeconds } = this.conf.eos
    const [ transactionHeaders, chainId ] = await this.getTxHeaders(meta, { expireInSeconds })

    const { Eos, keyProvider } = this.conf.eos

    const signingEos = Eos({
      httpEndpoint: null,
      chainId,
      keyProvider,
      transactionHeaders,
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

  async signTx (payload, auth, action, meta) {
    const signingEos = await this.prepareSign(meta)

    signingEos.fc.abiCache.abi('efinexchange', this.abis.exchange)
    const contract = await signingEos.contract('efinexchange')

    const transfer = await contract[action](payload, auth)
    const fixed = this.fixTx(transfer)

    return fixed
  }

  async signDeposit (payload, auth, meta) {
    const signingEos = await this.prepareSign(meta)

    signingEos.fc.abiCache.abi('efinextether', this.abis.token)
    const contract = await signingEos.contract('efinextether')

    const transfer = await contract.transfer(payload, auth)
    const fixed = this.fixTx(transfer)

    return fixed
  }
}

module.exports = SignHelper
