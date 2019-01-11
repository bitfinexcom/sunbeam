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
    - `moonbeam <String>` optional HTTP server to retrieve historical data
    - `eos <Object>` options passed to Eos client for signing transactions
      - `expireInSeconds <Number>` Expiration time for signed tx
      - `Eos <Class>` The official eosjs client Class from `require('eosjs')`
      - `httpEndpoint <String|null>` an Eos node HTTP endpoint, used to get the contract abi, if abi not passed via options.
      - `tokenContract <String|null>` name of the used token contract, defaults to `eosio.token`
      - `exchangeContract <String|null>` name of the used exchange contract, defaults to `efinexchange`
      - `abis <Object> (optional)` eosfinex contract abis, so no initial http request is required to get the contract abi and httpEndpoint can be omitted
        - `exchange <Object>` Exchange abi
        - `token <Object>` Token contract abi
      - `auth` Auth options
        - `keys` use default signing
          - `keyProvider <String>` your key, used to sign transactions
          - `account <String>` accountname to use for the key
          - `permission <String>` permission level to use for the account
        - `scatter <Object>` Scatter options if scatter is used for signing
          - `appName <String>` App name showed to Scatter user
          - `ScatterJS <Object>` Scatter instance
    - `transform <Object>` Options passed to state components
      - `orderbook <Object>`
        - `keyed <Boolean>` Manage state as keyed Objects instead of an Array
      - `wallet <Object>`
      - `orders <Object>`
        - `keyed <Boolean>` Manage state as keyed Objects instead of an Array
        - `markDeleted <Boolean>` cancelled orders are flagged as deleted, but not removed from the state


```js
const Eos = require('eosjs')
const opts = {
  url: 'wss://eosnode.example.com',
  eos: {
    expireInSeconds: 60 * 60, // 1 hour,
    Eos: Eos,
    httpEndpoint: 'https://eosnode.example.com:8888',
    abis: null, // fetched via http from eos node if null

    auth: {
      keys: {
        keyProvider: [''], // your key, used to sign transactions
        account: '', // accountname to use
        permission: '@active'
      },
      scatter: null
    }
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

For an example how to prefetch the contract abis to avoid the initial
HTTP request to an eos node, see [example-prefetched-abi-ws.js](example-prefetched-abi-ws.js).

For an example how to use Scatter for auth, see [example-scatter.js](example-scatter.js).

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

#### `sunbeam.auth() => Promise`

Takes the account name you have defined when creating a Sunbeam instance with
`opts.eos.account`. Your private key stays local.

It will sign a verification transaction that is send to the Websocket endpoint
for validation. This transaction is not applied to the chain, just used for
verifying the signature.

If you configured auth via scatter, it will connect to scatter. Remember to remove
any global references to ScatterJS **and any global references to Sunbeam**:

```js
window.ScatterJS = null;
```

Subscribes you to `wallet`, `trade` and `order` updates for the specified account.

#### `sunbeam.logoutScatter() => Promise`

Forgets scatter identity (if scatter is used for auth).

#### `sunbeam.place(order) => Promise`
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

#### `sunbeam.cancel(data) => Promise`

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
  side: 'bid',
  id: '18446744073709551612',
  clientId: '1536867193329'
})
```

The request will be signed locally using the `eosjs` module.

#### `sunbeam.withdraw(data) => Promise`

- `data`
  - `currency <String>` The currency to withdraw, e.g. `BTC`
  - `amount <String>` The amount to withdraw
  - `to <String> (optional)` The account to withdraw to.

Withdraws tokens to a specified account. The account must be the same as
the account used with EOSfinex.

Defaults to account passed in constructor, `opts.eos.account`.


*Example:*

```js
ws.withdraw({
  currency: 'EUR',
  amount: '0.678'
})
```

The request will be signed locally using the `eosjs` module.

#### `sunbeam.sweep(data) => Promise`

- `data`
  - `currency <String>` The currency to withdraw, e.g. `BTC`
  - `to <String> (optional)` The account to withdraw to.

Sweeps tokens to a specified account. The account must be the same as
the account used with EOSfinex.

Defaults to account passed in constructor, `opts.eos.account`.

*Example:*

```js
ws.sweep({
  currency: 'EUR'
})

// on success we receive a wallet update:
// [ '0', 'wu', [ 'exchange', 'EUR', 0, 0, null ] ]

// and the amount is transferred back to the deposit contract:
$ ./cleos get currency balance efinextether testuser1431
100.00000000 EUR
```

#### `sunbeam.deposit(data) => Promise`
  - `data`
    - `currency <String>` The currency to deposit, e.g. `BTC`
    - `amount <String>` The amount to deposit

Takes your user account, defined in `opts.eos.account`, and deposits the desired amount
to the exchange using the tether token contract.

*Example:*

```js
ws.deposit({
  currency: 'EUR',
  amount: '2'
})

// success:
// [ '0', 'wu', [ 'exchange', 'EUR', 2, 0, null ] ]
```

The request will be signed locally using the `eosjs` module.

#### `sunbeam.subscribeOrderBook(pair)`
  - `pair <String>` The pair, i.e. `BTC.USD`

Subscribe to orderbook updates for a pair. The format is `R0`: https://docs.bitfinex.com/v2/reference#ws-public-raw-order-books

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

#### `sunbeam.subscribePublicTrades(pair)`
  - `pair <String>` The pair, i.e. `BTC.USD`

Unsubscribe from public trade updates for a pair.

*Example:*

```js
ws.subscribePublicTrades('BTC.USD')
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
ws.subscribe('wallets', { account: 'testuser1431' })
```

#### `sunbeam.unsubscribe(channel, ?opts)`
  - `channel <String>` The channel to subscribe to
  - `opts <Object>` Additional data to send

Unsubscribes from a channel.

*Example:*

```js
ws.unsubscribe('wallets', { account: 'testuser1431' })
```

#### `sunbeam.requestHistory() => Promise`

Sends a verification transaction to a moonbeam server
to receive the trading history.

*Example:*

```js
const history = await ws.requestHistory()
console.log(history)
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

The input format is `R0`: https://docs.bitfinex.com/v2/reference#ws-public-raw-order-books

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

#### `sunbeam.onPrivateTradeUpdate(opts, handler)`
  - `opts <Object>`
  - `handler <Function>` The callback called for every update

*Example:*

```js
ws.onPrivateTradeUpdate({}, (update) => {
  console.log('ws.onPrivateTradeUpdate', update)
})
ws.auth()
```

Registered for `tu`, `te` messages via channel `0`.

#### `sunbeam.onPublicTradeUpdate(opts, handler)`
  - `opts <Object>`
    - `symbol <String>` The symbol to emit the public trade updates for, i.e. `BTC.USD`
  - `handler <Function>` The callback called for every update

*Example:*

```js
ws.onPublicTradeUpdate({ symbol: 'ETH.USD' }, (data) => {
  console.log('ws.onPublicTradeUpdate({ symbol: "ETH.USD" }')
  console.log(data) // emits [ 'ETH.USD', 'te', [ '3', 1537196302500, -0.9, 1 ] ]
})

ws.subscribePublicTrades('ETH.USD')
```

Registered for `tu`, `te` messages via the corresponding channel for the symbol.


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
