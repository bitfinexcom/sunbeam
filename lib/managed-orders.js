'use strict'

const MB = require('mandelbrot')

class Orders extends MB.BaseOrders {
  constructor (opts = {}) {
    super(opts)

    this.conf = opts
    this.state = []
  }

  deleteFromKeyed (update) {
    const { markDeleted } = this.conf
    const parsed = this.getKeyedFromArray(update)

    const uClientId = parsed.clientId
    const uSymbol = parsed.symbol

    if (markDeleted) {
      this.state = this.state.map((el) => {
        const { clientId, symbol } = el

        if (clientId === uClientId && symbol === uSymbol) {
          el.deleted = true
        }

        return el
      })

      return
    }

    this.state = this.state.filter((el) => {
      const { clientId, symbol } = el

      if (clientId === uClientId && symbol === uSymbol) {
        return false
      }

      return true
    })
  }

  deleteFromRaw (update) {
    const { markDeleted } = this.conf
    const [, , UClId, Usymbol] = update

    if (markDeleted) {
      this.state = this.state.map((el) => {
        const [, , clId, symbol] = el

        if (clId === UClId && symbol === Usymbol) {
          el.push('deleted')
        }

        return el
      })

      return
    }

    this.state = this.state.filter((el) => {
      const [, , clId, symbol] = el

      if (clId === UClId && symbol === Usymbol) {
        return false
      }
      return true
    })
  }

  applyUpdateSnapKeyed (update) {
    const parsed = this.getKeyedFromArray(update)

    const uClientId = parsed.clientId
    const uSymbol = parsed.symbol

    let found = false
    this.state = this.state.map((el) => {
      const { clientId, symbol } = el

      if (clientId !== uClientId) return el
      if (symbol !== uSymbol) return el

      found = true

      return parsed
    })

    if (!found) {
      this.state.push(parsed)
    }
  }

  applyUpdateSnapList (update) {
    const [, , UClId, Usymbol] = update

    let found = false
    this.state = this.state.map((el) => {
      const [, , clId, symbol] = el

      if (clId !== UClId) return el
      if (symbol !== Usymbol) return el

      found = true

      return update
    })

    if (!found) {
      this.state.push(update)
    }
  }

  getKeyedFromArray (el) {
    return {
      id: el[0],
      clientId: el[2],
      symbol: el[3],
      amount: el[6],
      origAmount: el[7],
      type: el[8],
      status: el[13],
      price: el[16]
    }
  }
}

module.exports = Orders
