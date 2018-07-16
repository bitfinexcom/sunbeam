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

const sbConf = { account: 'testuser1234' }
let sb = new Sunbeam(eos, sbConf)


class Clock extends Component {
  constructor(props) {
    super(props)

    this.state = {
      time: new Date()
    }
  }

  componentDidMount () {
    setInterval(() => {
      this.setState({ time: new Date() })
    }, 1000)
  }

  render (props, state) {
    const { time } = state
    return <time datetime={time.toISOString()}>{ time.toLocaleTimeString() }</time>
  }
}

const ErrorBox = (props) => {
  return (
    <div className="error">
      Error: {props.error}
    </div>
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
      return <ErrorBox error={state.error.message} />
    }

    return false
  }
}

const Select = (props) => {
  const { pairs, pair, eventBinding } = props

  const opts = pairs.map((el) => {
    return <option value={el}>{el}</option>
  })

  return (
    <label>
      <select value={pair} onChange={eventBinding}>
        {opts}
      </select>
    </label>
  )
}

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      pair: 'BTCUSD'
    }

    this.pairs = [ 'BTCUSD', 'ETHUSD']
  }

  onPairChange (event) {
    this.setState({
      pair: event.target.value
    })
  }

  render (props, state) {
    return (
      <div class="container">
        <div class="row">
          <div class="column"><Clock /> - {sbConf.account}@active - eosfinex - Pair: {state.pair}</div>
          <div class="column column-25">
            <div>
              <Select
                pair={this.state.pair}
                pairs={this.pairs}
                eventBinding={this.onPairChange.bind(this)}
              />
            </div>
          </div>

        </div>
        <Orderbook symbol={state.pair} />
      </div>
    )
  }
}


render((
  <App />
), document.body)
