import { h, render, Component } from 'preact'

import { exampleBook, examplePosition } from './data'

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

  render () {
    const {
      cancelcb,
      symbol,
      decimals,
    } = this.props

    const {
      bids,
      asks,
      error
    } = this.state

    return (
      <OrderbookInternal
        bids={bids}
        asks={asks}
        error={error}
        decimals={decimals}
        cancelcb={(id, side) => {cancelcb(id, symbol, side)}}
      />
    )
  }
}

class OrderbookInternal extends Component {
  render() {
    const {
      bids = [],
      asks =  [],
      error = false,
      cancelcb = () => {console.log('cancel cb called for orderbook')},
      decimals = 10,
    } = this.props

    if (error) {
      return <ErrorBox error={error.message} />
    }

    const sortedBids = bids.sort((a, b) => b.price-a.price)
    const sortedAsks = asks.sort((a, b) => a.price-b.price)
    return (
      <div className='orderbook__internal'>
        <div className='orderbook__title'>
          <h1 className='orderbook__title-bids'>
            Bids
          </h1>
          <h1 className='orderbook__title-asks'>
            Asks
          </h1>
        </div>
        <OrderbookSide data={sortedBids} cancelcb={cancelcb} decimals={decimals} side='bids' />
        <OrderbookSide data={sortedAsks} cancelcb={cancelcb} decimals={decimals} side='asks' />
      </div>
    )
  }
}

class OrderbookSide extends Component {
  render() {
    const {
      data = [],
      cancelcb,
      decimals,
      side,
    } = this.props
    return (
      <div className='orderbook__side'>
        <div className='orderbook__explaintable rowI'>
          <div className='row__price'>
            Price
          </div>
          <div className='row__quantity'>
            Quantity
          </div>
          <div className='row__cancelbutton'>
            Cancel
          </div>
        </div>
        {
          data.map((dataRow) => {
            return (<OrderbookRow data={dataRow} cancelcb={cancelcb} decimals={decimals} side={side} />)
          })
        }
      </div>
    )
  }
}

class OrderbookRow extends Component {
  render() {
    const {
      data: {
        id,
        account,
        price,
        qty,
        type,
      },
      cancelcb,
      decimals, // TODO is this the same for qty and amount always?
      side,
    } = this.props

    return (
      <div className='rowI'>
        <div className='row__price'>
          {price / 10 ** decimals}
        </div>
        <div className='row__quantity'>
          {qty / 10 ** decimals}
        </div>
        <div className='row__cancelbutton' onClick={(e) => cancelcb(id, side)}>
          X
        </div>
      </div>
    )
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

class Positions extends Component {
  componentDidMount () {
    const { symbol } = this.props

    this.periodicFetch = setInterval(() => {
      sb.orders('BTCUSD', {}, (err, res) => {
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

  render () {
    const {
      cancelcb,
      symbol,
      decimals,
    } = this.props

    const {
      bids,
      asks,
      error
    } = this.state

    return (
      <PositionsInternal
        bids={bids}
        asks={asks}
        error={error}
        decimals={decimals}
        cancelcb={(id, side) => {cancelcb(id, symbol, side)}}
      />
    )
  }
}

class PositionsInternal extends Component {
  render() {
    const {
      bids = [],
      asks = [],
      error = false,
      decimals = 10,
      cancelcb = () => console.log('cancelcb called for positions'),
    } = this.props

    if (error) {
      return <ErrorBox error={error.message} />
    }

    return (
      <div className='positions__internal'>
        <div className='positions__title'>
          TITLE
        </div>
        <div className='orderbook__explaintable rowI'>
          <div className='row__price'>
            Price
          </div>
          <div className='row__quantity'>
            Quantity
          </div>
          <div className='row__cancelbutton'>
            Cancel
          </div>
        </div>
        <div className='positions__bids'>
          {
            bids.map((bidRow) => {
              return <OrderbookRow data={bidRow} cancelcb={cancelcb} decimals={decimals} side='bids' />
            })
          }
        </div>
        <div className='positions__asks'>
          {
            asks.map((askRow) => {
              return <OrderbookRow data={askRow} cancelcb={cancelcb} decimals={decimals} side='asks' />
            })
          }
        </div>
      </div>
    )
  }  
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
