'use strict'

// this is a helper class for signing transactions
// currently it depends on metadata obtained by a
// nodeos http endpoint

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

  async getTxHeaders (eos, opts) {
    const { expireInSeconds } = opts

    const info = await eos.getInfo({})
    const chainDate = new Date(info.head_block_time + 'Z')
    let expiration = new Date(chainDate.getTime() + expireInSeconds * 1000)
    expiration = expiration.toISOString().split('.')[0]

    const block = await eos.getBlock(info.last_irreversible_block_num)

    const transactionHeaders = {
      expiration,
      ref_block_num: info.last_irreversible_block_num & 0xFFFF,
      ref_block_prefix: block.ref_block_prefix
    }

    return [ transactionHeaders, info.chain_id ]
  }

  async prepareSign () {
    await this.initMetaEos()

    const { expireInSeconds } = this.conf.eos
    const [ transactionHeaders, chainId ] = await this.getTxHeaders(this.metaEos, { expireInSeconds })

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

  async signTx (payload, auth, action) {
    const signingEos = await this.prepareSign()

    signingEos.fc.abiCache.abi('efinexchange', this.abis.exchange)
    const contract = await signingEos.contract('efinexchange')

    const transfer = await contract[action](payload, auth)
    const fixed = this.fixTx(transfer)

    return fixed
  }

  async signDeposit (payload, auth) {
    const signingEos = await this.prepareSign()

    signingEos.fc.abiCache.abi('efinextether', this.abis.token)
    const contract = await signingEos.contract('efinextether')

    const transfer = await contract.transfer(payload, auth)
    const fixed = this.fixTx(transfer)

    return fixed
  }
}

module.exports = SignHelper
