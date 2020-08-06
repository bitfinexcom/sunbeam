const { UALError } = require('universal-authenticator-library')

class PrivateKeyError extends UALError {
  constructor (message, type, cause = null) {
    super(message, type, cause, 'PrivateKey')
  }
}

module.exports = PrivateKeyError
