import { h, render, Component } from 'preact'
import linkState from 'linkstate'

// import { exampleBook, examplePosition } from './data'

const readNodeConf = {
  httpEndpoint: 'http://localhost:8888',
  keyProvider: [
    '5Kci5UR4h25CM4vCyQMTQy4pzMhqXZ8vnocYJJkm2eQb8cfHsWV'
  ]
}

const writeNodeConf = {
  httpEndpoint: 'http://localhost:8888',
  keyProvider: [
    '5Kci5UR4h25CM4vCyQMTQy4pzMhqXZ8vnocYJJkm2eQb8cfHsWV'
  ]
}
const eos = {
  Eos,
  readNodeConf,
  writeNodeConf
}

const sbConf = { dev: true, account: 'testuser1234' }
let sb = new Sunbeam(eos, sbConf)

class Clock extends Component {
  constructor (props) {
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
    <div className='error'>
      Error: {props.error}
    </div>
  )
}

class Orderbook extends Component {
  componentDidMount () {
    const { symbol } = this.props

    this.periodicFetch = setInterval(() => {
      sb.orderbook(symbol, {}, (err, res) => {
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

  componentWillUnmount () {
    clearInterval(this.periodicFetch)
  }

  render () {
    const {
      // symbol,
      decimals,
      user
    } = this.props

    const {
      bids,
      asks,
      error
    } = this.state

    return (
      <OrderbookInternal
        user={user}
        bids={bids}
        asks={asks}
        error={error}
        decimals={decimals}
        cancelcb={false}
      />
    )
  }
}

class OrderbookInternal extends Component {
  render () {
    const {
      bids = [],
      asks = [],
      error = false,
      decimals = 10,
      user = null
    } = this.props

    if (error) {
      return <ErrorBox error={error.message} />
    }

    const sortedBids = bids.sort((a, b) => b.price - a.price)
    const sortedAsks = asks.sort((a, b) => a.price - b.price)
    return (
      <div className='orderbook__internal'>
        <div className='row orderbook__title'>
          <div style="text-align: center" className='column column-40'>
            <h2 className='orderbook__title-bids'>
              Bids
            </h2>
          </div>
           <div style="text-align: center" className='column column-40 column-offset-20'>
            <h2 className='orderbook__title-asks'>
              Asks
            </h2>
          </div>
        </div>
        <div className='row'>
          <div className='column column-40'>
            <OrderbookSide user={user} data={sortedBids} cancelcb={false} decimals={decimals} side='bids' />
          </div>
          <div className='column column-40 column-offset-20'>
            <OrderbookSide user={user} data={sortedAsks} cancelcb={false} decimals={decimals} side='asks' />
          </div>
        </div>
      </div>
    )
  }
}

class OrderbookSide extends Component {
  render () {
    const {
      data = [],
      decimals,
      side,
      user
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
          <div className='row__cancelbutton' />
        </div>
        {
          data.map((dataRow) => {
            return (<OrderbookRow user={user} data={dataRow} cancelcb={false} decimals={decimals} side={side} />)
          })
        }
      </div>
    )
  }
}

class OrderbookRow extends Component {
  render () {
    const {
      data: {
        id,
        account,
        price,
        qty,
        // type
      },
      cancelcb, // false for order book, function for positions
      decimals, // TODO is this the same for qty and amount always?
      side,
      user
    } = this.props

    let lastElement = (
      <div className='row__cancelbutton'>
        <div className='row__cancelbutton__el'>
          { account === user ? <span style='color:rgba(200, 40, 40, 0.6);'>o</span> : null }
        </div>
      </div>
    )

    if (cancelcb && account === user) {
      lastElement = (
        <div style='cursor: pointer;' className='row__cancelbutton' onClick={(e) => cancelcb(id, side)}>
          <div className='row__cancelbutton__el'>X</div>
        </div>
      )
    } else if (cancelcb) {
      lastElement = (
        <div className='row__cancelbutton' />
      )
    }

    return (
      <div className='rowI'>
        <div className='row__price'>
          {price / 10 ** decimals}
        </div>
        <div className='row__quantity'>
          {qty / 10 ** decimals}
        </div>
        {lastElement}
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
      sb.orders(symbol, {}, (err, res) => {
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

  componentWillUnmount () {
    clearInterval(this.periodicFetch)
  }

  cancelOrder (id, symbol, side) {
    sb.cancel({
      id: id + '',
      symbol: symbol,
      side: side
    }, {}, (err, res) => {
      if (err) console.error(err)

      console.log('order cancelled')
    })
  }

  render () {
    const {
      symbol,
      decimals,
      user
    } = this.props

    const {
      bids,
      asks,
      error
    } = this.state

    return (
      <PositionsInternal
        pair={symbol}
        user={user}
        bids={bids}
        asks={asks}
        error={error}
        decimals={decimals}
        cancelcb={(id, side) => {
          let s = 'ask'
          if (side !== 'asks') {
            s = 'bid'
          }
          this.cancelOrder(id, symbol, s)
        }}
      />
    )
  }
}

class PositionsInternal extends Component {
  render () {
    const {
      bids = [],
      asks = [],
      error = false,
      decimals = 10,
      cancelcb = () => console.log('cancelcb called for positions'),
      user = null,
      pair
    } = this.props

    if (error) {
      return <ErrorBox error={error.message} />
    }

    return (
      <div className='column column-65 column-offset-10 positions__internal'>
        <div className='positions__title'>
          Positions for {pair}
        </div>
        <div className='orderbook__explaintable rowI'>
          <div className='row__price'>
            Price
          </div>
          <div className='row__quantity'>
            Quantity
          </div>
          <div className='row__cancelbutton' />
        </div>
        <div className='positions__bids'>
          {
            bids.map((bidRow) => {
              return <OrderbookRow user={user} data={bidRow} cancelcb={cancelcb} decimals={decimals} side='bids' />
            })
          }
        </div>
        <div className='positions__asks'>
          {
            asks.map((askRow) => {
              return <OrderbookRow user={user} data={askRow} cancelcb={cancelcb} decimals={decimals} side='asks' />
            })
          }
        </div>
      </div>
    )
  }
}

const SubmitOrder = (props) => {
  const {
    handleSubmit,
    type,
    amount,
    price,
    postonly,
    onAmountChange,
    onPriceChange,
    onPostOnlyChange,
    onTypeChange
  } = props

  return (
    <div class='column column-25'>
      <form onSubmit={handleSubmit}>
        <div>
          <label style='margin-right: 20px; display: inline;'>
            Buy
            <input
              style='margin-left: 5px'
              type='radio'
              value='buy'
              checked={type === 'buy'}
              onChange={onTypeChange} />
          </label>

          <label style='display: inline;'>
            Sell
            <input
              style='margin-left: 5px'
              type='radio'
              value='sell'
              checked={type === 'sell'}
              onChange={onTypeChange} />
          </label>
        </div>
        <label>
          Amount:
          <input type='text' value={amount} onInput={onAmountChange} />
        </label>
        <label>
          Price:
          <input type='text' value={price} onInput={onPriceChange} />
        </label>
        <label>
          <input style='margin-right: 5px' type='checkbox' value={postonly} onInput={onPostOnlyChange} />
          Post Only
        </label>
        <button style='float: right' class='button-black'>Submit</button>
      </form>
    </div>
  )
}

class App extends Component {
  constructor (props) {
    super(props)

    this.state = {
      pair: 'BTCUSD',
      error: null
    }

    this.pairs = [ 'BTCUSD' ]
  }

  onPairChange (event) {
    this.setState({
      pair: event.target.value
    })
  }

  handleSubmit (event) {
    event.preventDefault()

    const state = this.state

    const amnt = state.type !== 'buy' ? (state.amount * -1) + '' : state.amount
    const order = sb.createOrder({
      symbol: state.pair,
      price: state.price,
      amount: amnt,
      type: 'EXCHANGE_LIMIT',
      postOnly: state.postonly
    })

    sb.place(order, (err, res) => {
      if (err) {
        this.setState({ error: err })
        return
      }

      console.log('placed "sell" order')
      console.log(JSON.stringify(res, null, '  '))
    })
  }

  render (props, state) {
    const {
      pair,
      type,
      amount,
      price,
      postonly,
      error
    } = state

    return (
      <div class='container'>
        <div class='row'>
          <div class='column'><Clock /> - {sbConf.account}@active - eosfinex</div>
          <div class='column column-25'>
            <div>
              <Select
                pair={pair}
                pairs={this.pairs}
                eventBinding={this.onPairChange.bind(this)}
              />
            </div>
          </div>
        </div>
        <div class='infobox'>
          { error ? <ErrorBox error={error.message} /> : null}
        </div>
        <div style='margin-top: 3rem;' class='row'>
          <SubmitOrder
            pair={pair}
            type={type}
            amount={amount}
            price={price}
            postonly={postonly}
            onAmountChange={linkState(this, 'amount')}
            onPriceChange={linkState(this, 'price')}
            onPostOnlyChange={linkState(this, 'postonly')}
            onTypeChange={linkState(this, 'type', 'target.value')}
            handleSubmit={this.handleSubmit.bind(this)} />
          <Positions user={sbConf.account} symbol={pair} />
        </div>
        <div class='row'>
          <div class='column'>
            <Orderbook user={sbConf.account} symbol={pair} />
          </div>
        </div>
      </div>
    )
  }
}

render((
  <App />
), document.body)
