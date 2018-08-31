'use strict'

class Wallet {
  constructor (conf = {}) {
    this.state = []

    this.conf = conf
  }

  parse (d) {
    const copy = JSON.parse(JSON.stringify(d))

    if (this.isSnapshot(copy)) {
      return this.parseSnap(copy)
    }

    return this.parseUpdate(copy)
  }

  isSnapshot (u) {
    return Array.isArray(u[0])
  }

  parseSnap (snap) {
    const { decimals } = this.conf

    if (!decimals) {
      return snap
    }

    const dt = this.decimalsTransformer
    const res = snap.map((el) => {
      el[2] = dt(el[2], decimals)
      return el
    })

    return res
  }

  parseUpdate (update) {
    const { decimals } = this.conf

    // FIXME
    update[1] = update[1].toUpperCase()

    if (decimals) {
      const dt = this.decimalsTransformer
      update[2] = dt(update[2], decimals)
    }

    return update
  }

  update (u) {
    const copy = JSON.parse(JSON.stringify(u))

    if (this.isSnapshot(copy)) {
      this.setSnapshot(copy)
      return
    }

    this.applyUpdate(copy)
  }

  setSnapshot (snap) {
    const res = this.parseSnap(snap)

    this.state = res
  }

  decimalsTransformer (el, decimals) {
    return el / 10 ** decimals
  }

  applyUpdate (update) {
    update = this.parseUpdate(update)

    const [uType, uCur, uVal] = update
    let found = false

    this.state = this.state.map((el) => {
      const [type, cur] = el

      if (type !== uType) return el
      if (cur !== uCur) return el

      found = true
      return [uType, uCur, uVal]
    })

    if (!found) {
      this.state.push([uType, uCur, uVal])
    }
  }

  getState () {
    return this.state
  }
}

module.exports = Wallet
