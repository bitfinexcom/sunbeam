'use strict'

class SunbeamUAL {
  constructor (opts) {
    this.opts = Object.assign({
      appName: 'Eosfinex-UAL'
    }, opts)

    this.account = null
    this.user = this.opts.user
  }

  async auth () {
    if (!this.account) {
      const accountName = await this.user.getAccountName()
      const permission = 'active'

      this.account = {
        authorization: {
          authorization: accountName + '@' + permission
        },
        account: accountName,
        permission
      }
    }

    return this.account
  }
}

module.exports = SunbeamUAL
