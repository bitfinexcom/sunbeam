# sunbeam

Eosfinex adapter for Node and the browser.

```js
const Sunbeam = require('sunbeam')

// Browser usage: import into browsers in case you can't transpile ES6
const Sunbeam = require('sunbeam/dist')
```

## Examples

### Node.js

Example of the Websocket client usage: [example-ws.js](example-ws.js)


Run with:
```
node example-ws.js
```


## Websocket API

You can see all API calls in [example-ws.js](example-ws.js).

### `new Sunbeam(opts) => sunbeam`
  - `opts <Object>`
    - `url <String>` Address of the websocket eosfinex node
    - `eos <Object>` options passed to Eos client for signing transactions
      - `expireInSeconds <Number>` Expiration time for signed tx
      - `Eos <Class>` The official eosjs client Class from `require('eosjs')`
      - `httpEndpoint <String>` an Eos node HTTP endpoint, used to get metadata for signing transactions
      - `keyProvider <String>` your key, used to sign transactions
      - `account <String>` accountname to use for the key
      - `permission <String>` permission level to use for the account
    - `transform <Object>` Options passed to state components
      - `orderbook <Object>`
        - `keyed <Boolean>` Manage state as keyed Objects instead of an Array
      - `wallet <Object>`
      - `orders <Object>`
        - `keyed <Boolean>` Manage state as keyed Objects instead of an Array


```js
const Eos = require('eosjs')
const opts = {
  url: 'wss://eosnode.example.com',
  eos: {
    expireInSeconds: 60 * 60, // 1 hour,
    Eos: Eos,
    httpEndpoint: 'https://eosnode.example.com:8888', // used to get metadata for signing transactions
    keyProvider: [''], // your key, used to sign transactions
    account: '', //
    permission: '@active'
  },
  transform: {
    orderbook: { keyed: true },
    wallet: {},
    orders: { keyed: true }
  }
}

const ws = new Sunbeam(opts)
ws.open()
```

### Events emitted

#### `Event: open`

Emitted when the socket connection is established.

*Example:*

```js
const ws = new Sunbeam(opts)

ws.on('open', () => {
  // ready to trade!
})

ws.open()
```

#### `Event: message`

Emitted for every message that the websocket server server sends. Useful
debugging and custom extensions.

*Example:*

```js
ws.on('message', (m) => {
  console.log(m)
})
```

#### `Event: error`

Emitted in case of an error.

*Example:*

```js
ws.on('error', (m) => {
  console.error(m)
})
```

### General methods

You can see all API calls in [example-ws.js](example-ws.js).

#### `sunbeam.open()`

Opens a Websocket.

*Example:*

```js
ws.open()
```

#### `sunbeam.close()`

Closes the connection to eosfinex.

*Example:*

```js
ws.close()
```

#### `sunbeam.auth()`

Takes the account name you have defined when creating a Sunbeam instance with
`opts.eos.account` and sends it to the server. Your private key stays local.

Subscribes you to `wallet`, `trade` and `order` updates for the specified account.

#### `sunbeam.place(order)`
  - `order <Object>`
    - `symbol <String>` Token pair to trade for
    - `amount <String>` Amount to buy/sell
    - `type <String>` Order type, `EXCHANGE_MARKET`, `EXCHANGE_IOC` or `EXCHANGE_LIMIT`
    - `price <String>` Price for orders except market orders
    - `clientId <Number>` Every order must have a unique id assigned from the client, defaults to unix timestamp
    - `postOnly <Boolean>` Submit postonly order, sugar for flags `1`
    - `flags <Number>`

Creates an order compatible with the contract abi, pre-signs it and sends it
to the Websocket endpoint.

List of available flags

Some flags are abstracted by Sunbeam. Here is a full list of available flags:

```
type                         flag         abstraction available

post only                       1         postOnly: true
ioc                             2         EXCHANGE_IOC
market                          4         EXCHANGE_MARKET   
release on trade               64
sweep collateral              128

```

A post only order would have the flag 1,
a post only + ioc order would have the flag 3

*Example:*

```js

// available types: EXCHANGE_MARKET EXCHANGE_IOC EXCHANGE_LIMIT
const order = {
  symbol: 'BTC.USD',
  amount: '1',
  type: 'EXCHANGE_MARKET',
  clientId: '12345' // unique locally assigned id
}
ws.place(order)

// available types: EXCHANGE_MARKET EXCHANGE_IOC EXCHANGE_LIMIT
const order = {
  symbol: 'BTC.USD',
  amount: '1',
  price: '1',
  type: 'EXCHANGE_LIMIT',
  clientId: '12346'
}
ws.place(order)
```

The request will be signed locally using the `eosjs` module.

#### `sunbeam.cancel(data)`

  - `data`
    - `symbol <String>` The pair, i.e. `BTC.USD`
    - `side <String>` `bid` or `ask`
    - `id <String>` The id returned from the contract on placement
    - `clientId <String>` The unique id assigned by the client

Cancels an order.

*Example:*

```js
ws.cancel({
  symbol: 'BTC.USD',
  side: 'bids',
  id: '18446744073709551612',
  clientId: '1536867193329'
})
```

The request will be signed locally using the `eosjs` module.

#### `sunbeam.subscribeOrderBook(pair)`
  - `pair <String>` The pair, i.e. `BTC.USD`

Subscribe to orderbook updates for a pair.

*Example:*

```js
ws.onOrderBook({ symbol: 'BTC.USD' }, (ob) => {
  console.log('ws.onOrderBook({ symbol: "BTC.USD" }')
  console.log(ob)
})

ws.onManagedOrderbookUpdate({ symbol: 'BTC.USD' }, (ob) => {
  console.log('ws.onManagedOrderbookUpdate({ symbol: "BTC.USD" }')
  console.log(ob)
})

ws.subscribeOrderBook('BTC.USD')
```

#### `sunbeam.unSubscribeOrderBook(pair)`
  - `pair <String>` The pair, i.e. `BTC.USD`

Unsubscribe from orderbook updates for a pair.

*Example:*

```js
ws.unSubscribeOrderBook('BTC.USD')
```

#### `sunbeam.subscribe(channel, ?opts)`
  - `channel <String>` The channel to subscribe to
  - `opts <Object>` Additional data to send


Subscribes to a websocket channel.

*Example:*

```js
this.subscribe('wallets', { account: 'testuser1431' })
```

#### `sunbeam.unsubscribe(channel, ?opts)`
  - `channel <String>` The channel to subscribe to
  - `opts <Object>` Additional data to send

Unsubscribes from a channel.

*Example:*

```js
this.unsubscribe('wallets', { account: 'testuser1431' })
```

### Managed State Updates

Usually the Bitfinex trading protocol will send a snapshot, and later just
updates, for performance reasons.

When you register a `managed` orderbook handler, the managed state component
will take care of parsing the snapshots update the state when partial updates arrive.

For every update, the full updated data is emitted.

#### `sunbeam.onManagedOrderbookUpdate(opts, handler)`
  - `opts <Object>`
    - `symbol <String>` The symbol to emit the orderbook update for, i.e. `BTC.USD`
  - `handler <Function>` Called every time the state is updated

If you want to manage state on your own, our just need a stream of updates, use
the `onOrderBook` handler.

*Example:*

```js
ws.onManagedOrderbookUpdate({ symbol: 'BTC.USD' }, (ob) => {
  console.log(ob)
})
ws.subscribeOrderBook('BTC.USD')
```

Registered for messages from the corresponding book channel (received on subscribe).

#### `sunbeam.onManagedWalletUpdate(opts, handler)`
  - `opts <Object>`
  - `handler <Function>` Called every time the state is updated

*Example:*

```js
ws.onManagedWalletUpdate({}, (mw) => {
  console.log(mw)
})
ws.auth()
```

Registered for `ws`, `wu` messages via channel `0`.

#### `sunbeam.onManagedOrdersUpdate(filter, handler)`
  - `opts <Object>`
  - `handler <Function>` Called every time the state is updated

*Example:*

```js
ws.onManagedOrdersUpdate({}, (orders) => {
  console.log(orders)
})
ws.auth()
```

Registered for `os`, `on`, `ou`, `oc` messages via channel `0`.

### Plain updates

If you want to manage state on your own, or have a special use case, you can
use unmanaged handlers.

#### `sunbeam.onWallet(opts, handler)`
  - `opts <Object>`
  - `handler <Function>` Called every time the state is updated

*Example:*

```js
ws.onWallet({}, (wu) => {
  console.log(wu)
})
ws.auth()
```

Registered for `ws`, `wu` messages via channel `0`.

#### `sunbeam.onOrderUpdate(opts, handler)`
  - `opts <Object>`
  - `handler <Function>` The callback called for every update

*Example:*

```js
ws.onOrderUpdate({}, (data) => {
  console.log(data)
})
ws.auth()
```

Registered for `os`, `on`, `ou`, `oc` messages via channel `0`.

#### `sunbeam.onTradeUpdate(opts, handler)`
  - `opts <Object>`
  - `handler <Function>` The callback called for every update

*Example:*

```js
ws.onTradeUpdate({}, (update) => {
  console.log(update)
})
ws.auth()
```

Registered for `tu`, `te` messages via channel `0`.


#### `sunbeam.onOrderBook(opts, handler)`
  - `opts <Object>`
    - `symbol <String>` The symbol to emit the orderbook update for, i.e. `BTC.USD`
  - `handler <Function>` The callback called for every update

Just emits order updates and order snapshots without keeping or managing state.

*Example:*

```js
ws.onOrderBook({ symbol: 'BTC.USD' }, (ob) => {
  console.log(ob)
})
ws.subscribeOrderBook('BTC.USD')
```

Registered for messages from the corresponding book channel (received on subscribe).

## Standalone Managed State Helper

Sunbeam can take care of managing state snapshots for you, and keeps them up to date when the API sends updates. The state helpers can also be used as standalone components. They are also integrated into the main Websocket client, and are accessed by the `onManaged[]StateUpdate` [handlers you can register](https://github.com/bitfinexcom/sunbeam/blob/37b44247a2a7d6be51fa65f58e75e0eb8c48de74/example-ws.js#L45).


| Component  | Example for standalone usage |
| --- | --- |
| Wallet  |  [example-wallet.js](example-wallet.js)  |
| Orderbook  | [example-orderbook.js](example-orderbook.js)  |
| Orders | [example-orders.js](example-orders.js) |


Run with:
```
node example-wallet.js
node example-orderbook.js
node example-orders.js
```

Sometimes you may want to interact with Sunbeam's managed state. They are exposed through a method:

```js

sb.getManagedStateComponent('wallet')
sb.getManagedStateComponent('orders')
sb.getManagedStateComponent('books', 'BTC.USD')
```

## Setup your node

Start nodeos:

```
nodeos --access-control-allow-origin "*" --verbose-http-error --http-validate-host=false --enable-stale-production --producer-name eosio --plugin eosio::chain_api_plugin --plugin eosio::net_api_plugin
```

`--contracts-console` will output the logging from custom contracts

### Browsers

Enable CORS for your EOS node, by enabling it via config:

```
cd ~/eosdata/

echo "access-control-allow-origin = *" >> config.ini
```


## HTTP API demos (deprecated!)

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
nodemon test/browser-exchange/dev.js -w test/browser-exchange/jsx/*.jsx
```


## HTTP API (deprecated!)

You can see all API calls in [example-http.js](example-http.js).

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

*Example:*

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
  - `symbol` (string) the symbol, e.g. `BTC.USD`
  - `price` (string) the sell/buy price, omit for `EXCHANGE_MARKET` orders
  - `amount` (string) the amount, set to negative value for selling
  - `type`  (string) the order type, supported are `EXCHANGE_LIMIT` and `EXCHANGE_MARKET`
  - `flags` (number) optional: define order flags
  - `clientId` (number) id to identify the id

Creates an Order object for the eosfinex contract. Mimics the Bitfinex Api v2.

For market orders, the price must be omitted.

Available flags:

```
post only                       1
ioc                             2
release on trade               64
sweep collateral              128
```

The summation of flags may result in multiple flags. The flag `3` means ioc post only.

sweep collateral will automatically transfer funds out of the exchange upon an order cancel.
release on trade will automatically transfer funds out of the exchange upon an order fill.

**Example:**

```js
const order = sb.createOrder({
  symbol: 'BTC.USD',
  price: '2100',
  amount: '-14.99',
  type: 'EXCHANGE_LIMIT',
  clientId: '123'
})
```

**Example - post only + ioc flag set:**

```js
const order = sb.createOrder({
  symbol: 'BTC.USD',
  price: '2100',
  amount: '-14.99',
  type: 'EXCHANGE_LIMIT',
  clientId: '123',
  flags: '3'
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
  - `symbol` (string) the symbol, e.g. `BTC.USD`
  - `opts` (object)
    - `transform` (boolean) set true for an order book that is similar to the Bitfinex API v2

Retrieves the order book for a given symbol from the read node.

**Example:**

```js
// orderbook: bfx api v2 style (keyed)
sb.orderbook('BTC.USD', { transform: true }, (err, res) => {
  if (err) throw err

  console.log('orderbook: bfx api v2 style (keyed)')
  console.log(JSON.stringify(res, null, '  '))
})

// orderbook: raw
sb.orderbook('BTC.USD', {}, (err, res) => {
  if (err) throw err

  console.log('orderbook: raw')
  console.log(JSON.stringify(res, null, '  '))
})
```

### `sunbeam.orders(symbol, opts, cb) => err, orderbook`
  - `symbol` (string) the symbol, e.g. `BTC.USD`
  - `opts` (object)
    - `account` (boolean) optional: use different account than from initial `new Sunbeam`

Retrieves the placed orders for an account.

**Example:**

```js
// orders, uses account passed when Sunbeam instance was created
sb.orders('BTC.USD', {}, (err, res) => {
  if (err) throw err

  console.log('orders, default account', opts.account)
  console.log(JSON.stringify(res, null, '  '))
})

// orders, testuser1234
sb.orders('BTC.USD', { user: 'testuser1234' }, (err, res) => {
  if (err) throw err

  console.log('orders, user testuser1234')
  console.log(JSON.stringify(res, null, '  '))
})
```

### `sunbeam.cancel(trade, opts, cb) => err, tx`
  - `trade` (object)
    - `id`: the id that was assigned by the contract
    - `symbol` (string) symbol, e.g. `BTC.USD`
    - `side` (string) possible values: `bid|ask`

  - `opts` (object)

Cancels and order. Requires the id assigned by the contract, which can be retireved from reading the order book.

**Example:**

```js
sb.cancel({
  id: '1',
  symbol: 'BTC.USD',
  side: 'ask'
}, {}, (err, res) => {
  if (err) throw err

  console.log(JSON.stringify(res, null, '  '))
})
```

### `sunbeam.withdraw(data, opts, cb) => err, tx`
  - `data` (object)
    - `amount`: the id that was assigned by the contract
    - `symbol` (string) symbol, e.g. `BTC`
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
  currency: 'BTC',
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

### `sunbeam.sweep(data, opts, cb) => err, tx`
  - `data` (object)
    - `symbol` (string) symbol, e.g. `BTC`
    - `to` (string) optional: address to withdrawal to (defaults to current account)

  - `opts` (object)

Sweeps the whole balance for a token from the exchange to an account.

**Example:**

```js
sb.sweep({
  currency: 'USD'
}, {}, (err, res) => {
  if (err) throw err

  console.log(JSON.stringify(res, null, '  '))
})
```
