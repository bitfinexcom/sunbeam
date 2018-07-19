# sunbeam

## Setup

Start nodeos:

```
nodeos --data-dir ~/eosdata/ --config-dir ~/eosdata/ --contracts-console --http-validate-host=false
```

`--contracts-console` will output the logging from custom contracts

## Examples

### Node.js

```
node example.js
```

### Browsers

Enable CORS for your EOS node, by enabling it via config:

```
cd ~/eosdata/

echo "access-control-allow-origin = *" >> config.ini
```

#### Testpage in Browser

```
# delete cached eosjs
rm test/browser-test/eosjs-dist.js

# start
node test/browser-test/dev.js
```

#### Demo Exchange page

```
# delete cached eosjs
rm test/browser-exchange/eosjs-dist.js

# start
node test/browser-exchange/dev.js
```


## API

You can see all API calls in [example.js](example.js).

There are also browser demos available at [test/browser/](test/browser/).

### `new Sunbeam(eos, ?opts)`
 - `eos` (object)
  - `Eos` (object) the eosjs module you want to use
  - `readNodeConf` (object) config for read node
  - `writeNodeConf` (object )config for write node
 - `opts` (object)
  - `account` (string) account name you want to use
  - `dev` (boolean) don't check for seperate read/write node

Creates a new Sunbeam instance. Currently you have to pass the eosjs library and config for a read and write node.

**Example:**

```js
const Sunbeam = require('sunbeam')
const Eos = require('eosjs')

const readNodeConf = {
  httpEndpoint: 'http://localhost:8888',
  keyProvider: [
    '5Kci5UR4h25CM4vCyQMTQy4pzMhqXZ8vnocYJJkm2eQb8cfHsWV'
  ]
}

const writeNodeConf = {
  httpEndpoint: 'http://writenode.example.com:8888',
  keyProvider: [
    '5Kci5UR4h25CM4vCyQMTQy4pzMhqXZ8vnocYJJkm2eQb8cfHsWV'
  ]
}
const eos = {
  Eos,
  readNodeConf,
  writeNodeConf
}

const opts = { account: 'testuser4321', dev: false }
const sb = new Sunbeam(eos, opts)
```

### `sunbeam.createOrder(order) => Order`
 - `order` (object)
  - `symbol` (string) the symbol, e.g. `BTCUSD`
  - `price` (string) the sell/buy price, omit for `EXCHANGE_MARKET` orders
  - `amount` (string) the amount, set to negative value for selling
  - `type`  (string) the order type, supported are `EXCHANGE_LIMIT` and `EXCHANGE_MARKET`
  - `postOnly` (boolean) optional: insert order only if there is no match (maker)
  - `clientId` (number) id to identify the id

Creates an Order object for the eosfinex contract. Mimics the Bitfinex Api v2.

For market orders, the price must be omitted.

**Example:**

```js
const order = sb.createOrder({
  symbol: 'BTCUSD',
  price: '2100',
  amount: '-14.99',
  type: 'EXCHANGE_LIMIT',
  clientId: '123'
})
```

### `sunbeam.place(order, cb) => err, tx`
 - `order` (object)

Takes a Sunbeam order object and sends it to the writing node. Returns tx details.

**Example:**

```js
sb.place(order, (err, res) => {
  if (err) throw err

  console.log('placed "sell" order')
  console.log(JSON.stringify(res, null, '  '))
})
```

### `sunbeam.orderbook(symbol, opts, cb) => err, orderbook`
  - `symbol` (string) the symbol, e.g. `BTCUSD`
  - `opts` (object)
    - `transform` (boolean) set true for an order book that is similar to the Bitfinex API v2

Retrieves the order book for a given symbol from the read node.

**Example:**

```js
// orderbook: bfx api v2 style (keyed)
sb.orderbook('BTCUSD', { transform: true }, (err, res) => {
  if (err) throw err

  console.log('orderbook: bfx api v2 style (keyed)')
  console.log(JSON.stringify(res, null, '  '))
})

// orderbook: raw
sb.orderbook('BTCUSD', {}, (err, res) => {
  if (err) throw err

  console.log('orderbook: raw')
  console.log(JSON.stringify(res, null, '  '))
})
```

### `sunbeam.orders(symbol, opts, cb) => err, orderbook`
  - `symbol` (string) the symbol, e.g. `BTCUSD`
  - `opts` (object)
    - `account` (boolean) optional: use different account than from initial `new Sunbeam`

Retrieves the placed orders for an account.

**Example:**

```js
// orders, uses account passed when Sunbeam instance was created
sb.orders('BTCUSD', {}, (err, res) => {
  if (err) throw err

  console.log('orders, default account', opts.account)
  console.log(JSON.stringify(res, null, '  '))
})

// orders, testuser1234
sb.orders('BTCUSD', { user: 'testuser1234' }, (err, res) => {
  if (err) throw err

  console.log('orders, user testuser1234')
  console.log(JSON.stringify(res, null, '  '))
})
```

### `sunbeam.cancel(trade, opts, cb) => err, tx`
  - `trade` (object)
    - `id`: the id that was assigned by the contract
    - `symbol` (string) symbol, e.g. `BTCUSD`
    - `side` (string) possible values: `bid|ask`

  - `opts` (object)

Cancels and order. Requires the id assigned by the contract, which can be retireved from reading the order book.

**Example:**

```js
sb.cancel({
  id: '1',
  symbol: 'BTCUSD',
  side: 'ask'
}, {}, (err, res) => {
  if (err) throw err

  console.log(JSON.stringify(res, null, '  '))
})
```

### `sunbeam.withdraw(data, opts, cb) => err, tx`
  - `data` (object)
    - `amount`: the id that was assigned by the contract
    - `symbol` (string) symbol, e.g. `BTCUSD`
    - `to` (string) optional: address to withdrawal to (defaults to current account)

  - `opts` (object)

Withdraws tokens from the exchange.

**Example:**

```
$ cleos get currency balance efinexchange testuser4321
925.0500000000 BTC
99999.9400000000 USD

$ cleos get currency balance efinextether testuser4321
1000.0000000000 BTC
```

```js
sb.withdraw({
  currency: 'BTCUSD',
  amount: '0.678'
}, {}, (err, res) => {
  if (err) throw err

  console.log(JSON.stringify(res, null, '  '))
})
```

```
$ cleos get currency balance efinextether testuser4321
1000.0000000000 BTC
0.6780000000 USD
```

### `sunbeam.balance(cb) => err, balances`

Returns the current wallet balance for the user.


**Example:**

```js
sb.balance((err, res) => {
  if (err) throw err

  console.log(JSON.stringify(res, null, '  '))
})
```
