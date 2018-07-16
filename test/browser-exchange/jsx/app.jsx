import { h, render, Component } from 'preact'

const readNodeConf = {
  httpEndpoint: 'http://localhost:8888',
  keyProvider: [
    '5Kci5UR4h25CM4vCyQMTQy4pzMhqXZ8vnocYJJkm2eQb8cfHsWV'
  ]
}

const writeNodeConf = {
  httpEndpoint: 'http://writenode.bitfinex.com:8888',
  keyProvider: [
    '5Kci5UR4h25CM4vCyQMTQy4pzMhqXZ8vnocYJJkm2eQb8cfHsWV'
  ]
}
const eos = {
  Eos,
  readNodeConf,
  writeNodeConf
}

let sb = new Sunbeam(eos, { account: 'testuser1234' })


class Clock extends Component {
  render () {
    let time = new Date()
    return <time datetime={time.toISOString()}>{ time.toLocaleTimeString() }</time>
  }
}

const ErrorBox = (text) => {
  return (
    <div className="">{text}</div>
  )
}

class Orderbook extends Component {

  componentDidMount () {
    const { symbol } = this.props

    this.periodicFetch = setInterval(() => {
      sb.orderbook('BTCUSD', {}, (err, res) => {
        if (err) {
          return this.setState({ error: err })
        }

        this.setState({
          error: false,
          asks: res.asks,
          bids: res.bids
        })
      })
    }, 1000)
  }

  componentWillUnmount() {
    clearInterval(this.periodicFetch)
  }

  render (props, state) {
    if (state.error) {
      return <ErrorBox text={state.error} />
    }

    return false
  }
}


render((
  <div class="container">
    <Clock />
    <Orderbook symbol="BTCUSD" />
  </div>
), document.body)
