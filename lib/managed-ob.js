'use strict'

class Orderbook {
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
    const f = (el) => {
      return el.id !== id
    }

    return {
      asks: state.asks.filter(f),
      bids: state.bids.filter(f)
    }
  }

  deleteFromRaw (id, state) {
    const filtered = state.filter((el) => {
      return el[0] !== id
    })

    return filtered
  }

  applyDelete (id, state, keyed) {
    if (keyed) {
      return this.deleteFromKeyed(id, state)
    }

    return this.deleteFromRaw(id, state)
  }

  deleteEntry (id) {
    const { keyed } = this.conf
    this.state = this.applyDelete(id, this.state, keyed)
  }

  applyUpdate (update) {
    const [id, price, amount] = update

    if (price === 0) {
      // when PRICE = 0 then you have to delete the order
      return this.deleteEntry(id)
    }

    const parsed = this.parseUpdate(update)
    const { keyed } = this.conf

    if (!keyed) {
      this.state.push(parsed)
      return
    }

    if (amount < 0) this.state.asks.push(parsed)
    if (amount > 0) this.state.bids.push(parsed)
  }

  parseUpdate (el) {
    const { decimals, keyed } = this.conf
    const dt = this.decimalsTransformer

    const [id, price, amount] = el
    let update = [id, price, amount]

    if (decimals) {
      update = [id, dt(price, decimals), dt(amount, decimals)]
    }

    if (keyed) {
      update = {
        id: update[0],
        price: update[1],
        amount: update[2]
      }
    }

    return update
  }

  parseSnap (snap) {
    const { decimals, keyed } = this.conf
    const dt = this.decimalsTransformer

    // raw
    if (!keyed && !decimals) {
      return snap
    }

    if (decimals) {
      snap = snap.map((el) => {
        const [id, price, amount] = el
        return [id, dt(price, decimals), dt(amount, decimals)]
      })
    }

    if (!keyed) {
      return snap
    }

    const keyedSnap = this.getKeyedSnap(snap)
    return keyedSnap
  }

  getKeyedSnap (snap) {
    const asks = snap.filter(el => el[2] > 0)
    const bids = snap.filter(el => el[2] < 0)

    const mp = (el) => {
      // [id, price, amount]
      const order = {
        id: el[0],
        price: el[1],
        amount: el[2]
      }

      return order
    }

    const ob = {
      asks: bids.map(mp).sort((a, b) => b.price - a.price),
      bids: asks.map(mp).sort((a, b) => a.price - b.price)
    }

    return ob
  }

  getState () {
    return this.state
  }

  decimalsTransformer (el, decimals) {
    return el / 10 ** decimals
  }
}

module.exports = Orderbook
