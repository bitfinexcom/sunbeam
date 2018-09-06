'use strict'

class Orders {
  constructor (opts = {}) {
    this.conf = opts

    this.state = []
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
    const [ UId, , , Usymbol ] = update

    let found = false
    this.state = this.state.map((el) => {
      const [ id, , , symbol ] = el

      if (id !== UId) return  el
      if (symbol !== Usymbol) return el

      found = true

      return update
    })

    if (!found) {
      this.state.push(update)
    }
  }

  parseUpdate (el) {
    return el
  }

  parseSnap (snap) {
    // raw
    return snap
  }

  getState () {
    return this.state
  }
}

module.exports = Orders
