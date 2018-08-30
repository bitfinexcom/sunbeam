'use strict'

class Wallet {
  constructor () {
    this.state = []
  }

  update (u) {
    if (Array.isArray(u[0])) {
      this.setSnapshot(u)
      return
    }

    this.applyUpdate(u)
  }

  setSnapshot (snap) {
    this.state = snap
  }

  applyUpdate (update) {
    // FIXME
    update[1] = update[1].toUpperCase()

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
