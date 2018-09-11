'use strict'

class Orders {
  constructor (opts = {}) {
    this.conf = opts

    const { keyed } = this.conf
    this.state = keyed ? { asks: [], bids: [] } : []
  }

  isSnapshot (d) {
    if (!d[0]) {
      // empty snap
      return true
    }

    if (Array.isArray(d[0])) {
      return true
    }
  }

  parse (d) {
    const copy = JSON.parse(JSON.stringify(d))

    if (this.isSnapshot(copy)) {
      return this.parseSnap(copy)
    }

    return this.parseUpdate(copy)
  }

  update (d) {
    const copy = JSON.parse(JSON.stringify(d))

    if (this.isSnapshot(copy)) {
      this.setSnapshot(copy)
      return
    }

    this.applyUpdate(copy)
  }

  setSnapshot (snap) {
    this.state = this.parseSnap(snap)
  }

  deleteFromKeyed (id, state) {
    throw new Error('not implemented')
  }

  deleteFromRaw (id, state) {
    throw new Error('not implemented')
  }

  applyDelete (id, state, _keyed) {
    throw new Error('not implemented')
  }

  deleteEntry (id) {
    throw new Error('not implemented')
  }

  applyUpdate (update) {
    const { keyed } = this.conf

    if (!keyed) return this.applyUpdateSnapList(update)

    this.applyUpdateSnapKeyed(update)
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
    const [ , , UClId, Usymbol ] = update

    let found = false
    this.state = this.state.map((el) => {
      const [ , , clId, symbol ] = el

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

  parseUpdate (el) {
    const { keyed } = this.conf

    if (!keyed) return el

    return this.getKeyedFromArray(el)
  }

  parseSnap (snap) {
    const { keyed } = this.conf

    if (!keyed) return snap

    const keyedSnap = snap.map((el) => {
      return this.getKeyedFromArray(el)
    })

    return keyedSnap
  }

  getState () {
    return this.state
  }
}

module.exports = Orders
