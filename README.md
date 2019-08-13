[![Build Status](https://travis-ci.org/bitfinexcom/sunbeam.svg?branch=master)](https://travis-ci.org/bitfinexcom/sunbeam)

# sunbeam

Eosfinex Websocket adapter for Node and the browser.

We designed the eosfinex Websocket API with both speed and compatibility in mind.
It is a subset of the existing Bitfinex API v2, with modifications
for on-chain trading. Existing API v2 users should be able to start with
only a small changeset to their existing clients.

sunbeam is the current reference implementation of the Websocket API client. It
interacts with the contract ABI. For more details, see the
[signing section](#signing).

This readme covers both the sunbeam API and explains how it interacts behind
the scenes with the server.

The main difference between the Bitfinex WS API and eosfinex's API is the
signing of messages. For eosfinex, we have to sign actions with our eosjs
private key. A signed transaction is also used for subscriptions to trade,
order and wallet snapshots and updates.

```js
const Sunbeam = require('sunbeam')

// Browser usage: import into browsers in case you can't transpile ES6
const Sunbeam = require('sunbeam/dist')
```

## Paper Trading

On paper trading tokens are generally prefixed by `P`. So `USDT` becomes
`PUSDT`. The only exception is the resource token `EOX`. For a list of
available trading pairs, see [#trade-pairs](#trade-pairs).

## Examples

### Node.js

Example of the Websocket client usage: [example-ws.js](example-ws.js)


Run with:
```
node example-ws.js
```


## Websocket API

You can see all API calls in [example-ws.js](example-ws.js).

### `new Sunbeam(client, opts) => sunbeam`
  - `client <Object>`
    - `rpc` official eosjs rpc class instance
    - `api` official eosjs Api class instance
  - `opts <Object>`
    - `url <String>` Address of the Websocket eosfinex node
    - `eos <Object>` options passed to Eos client for signing transactions
      - `expireInSeconds <Number>` Expiration time for signed tx
      - `httpEndpoint <String|null>` an Eos node HTTP endpoint, used to get the contract abi, if abi not passed via options.
      - `tokenContract <String|null>` name of the used token contract, defaults to `eosio.token`
      - `exchangeContract <String|null>` name of the used exchange contract, defaults to `efinexchange`
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
// prepare eosjs lib for signing of websocket messages

const { Api, JsonRpc } = require('eosjs')
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig')


const fetch = require('node-fetch')
const { TextDecoder, TextEncoder } = require('util')
const keys = ['SECRET']

const signatureProvider = new JsSignatureProvider(keys)

const httpEndpoint = 'https://api-paper.eosfinex.com'

const rpc = new JsonRpc(httpEndpoint, { fetch })
const api = new Api({
  rpc,
  signatureProvider,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder()
})

const client = {
  rpc,
  api
}

// setup sunbeam
const opts = {
  url: 'wss://api-paper.eosfinex.com/ws/',
  eos: {
    expireInSeconds: 60 * 60, // 1 hour,
    httpEndpoint: httpEndpoint, // used to get metadata for signing transactions
    tokenContract: 'eosio.token', // Paper sidechain token contract
    exchangeContract: 'eosfinex', // Paper sidechain exchange contract
    auth: {
      keys: {
        account: '', // accountname to use
        permission: 'active'
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

const ws = new Sunbeam(client, opts)
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

Emitted for every message that the Websocket client receives. Useful for
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

Closes the connection to the server.

*Example:*

```js
ws.close()
```

#### `sunbeam.auth() => Promise`

Subscribes you to `wallet`, `trade` and `order` updates for the specified account.


Takes the account name you have defined when creating a Sunbeam instance with
`opts.eos.auth` or receives the account name from Scatter. Your private key
stays on your machine.

<a id="auth" />

You can authenticate on the eosfinex Websocket API like with the Bitfinex API.
The API will then send you your wallet, order and trades snapshots and updates.
For this a special action is available in the contract ABI called `validate`.
The Websocket plugin uses it to verify that the transaction belongs to the
proper account.

Sunbeam signs a verification transaction that is send to the Websocket endpoint
for validation. This transaction is just used for verifying the signature.

If you configured auth via scatter, it will connect to scatter. Remember to remove
any global references to ScatterJS **and any global references to Sunbeam**:

```js
window.ScatterJS = null;
```

*Sent payload:*

```
{
 event: 'auth',
 account: '$YOUR_USERNAME',
 meta: signed
}
```

Where `signed` is a signed transaction for the `validate` action.

*important:* to be able to trade, you have to accept the terms of service.


#### `sunbeam.acceptTos(version)`

Accepts the terms of service. Must be called before `.auth()`


#### `sunbeam.getSignedTx(?user) => Promise`

  - `user <Object>` optional user object. if not defined, will use the data provided in the constructor or retrieve it from scatter

Signs a transaction that can be used for login on the WS server for custom auth flows.

Example:

```js
const user = {
  authorization: {
    authorization: "testuser1114@active"
  },
  account: "testuser1114",
  permission: "active"
}

const signed = await ws.getSignedTx(user)

const getData = (data) => {
  return {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  }
}

// get history
const history = await fetch(moonbeamUrl + '/history', getData({
  meta: signed,
  limit: 50
})).then(res => res.json())

console.log(history)
```

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

Creates an order compatible with the contract ABI, pre-signs it and sends it
to the Websocket endpoint.

To be able to identify the order, a client **MUST** send a custom client id with it
that must be unique to the clients orders.


##### List of available flags
<a id="order-flags" />

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
A post only + IOC order would have the flag 3

<a id="signing" />
<a id="abi" />

Behind the scenes Sunbeam uses the exchange contract ABI to sign the transaction.
The ABI is publicly available via `cleos` or curl:

```
curl --request POST \
  --url https://api-paper.eosfinex.com/v1/chain/get_abi \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --data '{"account_name":"eosfinex"}'
```

For an introduction to the contract ABI, see https://medium.com/eosfinexproject/the-eosfinex-exchange-contract-9c971c1aed1b

After signing, the transaction is sent to the Websocket server:

```js
const signed = {
  "expiration": "2019-05-10T18:17:13.000",
  "ref_block_num": 27684,
  "ref_block_prefix": 959416581,
  "max_net_usage_words": 0,
  "max_cpu_usage_ms": 0,
  "delay_sec": 0,
  "context_free_actions": [],
  "actions": [
    {
      "account": "efinexchange",
      "name": "place",
      "authorization": [
        {
          "actor": "testuser1114",
          "permission": "active"
        }
      ],
      "data": "40420857619DB1CAF1B4BFA26A01000000800139610D3A5548DA2D0000000000942A00000000000000"
    }
  ],
  "transaction_extensions": [],
  "signatures": [
    "SIG_K1_Ke541LARCg24Zg66cacNLEfrJXJzfdgeZKNmyKEsxyGUVFxxEPxqJqYQJgv8gc2CXsG9a5HYvDrMePUGyfH8P6uihDoiSp"
  ]
}

// sent payload to server:
[0, 'on', null, { meta: signed }]
```


*Example:*

```js

// available types: EXCHANGE_MARKET EXCHANGE_IOC EXCHANGE_LIMIT
const order = {
  symbol: 'EOX.USDT',
  amount: '1',
  type: 'EXCHANGE_MARKET',
  clientId: '12345' // unique locally assigned id
}
ws.place(order)

// available types: EXCHANGE_MARKET EXCHANGE_IOC EXCHANGE_LIMIT
const order = {
  symbol: 'EOX.USDT',
  amount: '1',
  price: '1',
  type: 'EXCHANGE_LIMIT',
  clientId: '12346'
}
ws.place(order)
```

The request will be signed locally using the `eosjs` module.

*Sent payload:*

```
[0, 'on', null, { meta: signed }]
```

`signed` is a signed payload for the `place` [action of the **exchange contract**](#abi).

#### `sunbeam.cancel(data) => Promise`

  - `data`
    - `symbol <String>` The pair, i.e. `EOX.USDT`
    - `side <String>` `bid` or `ask`
    - `id <String>` The id returned from the contract on placement
    - `clientId <String>` The unique id assigned by the client

Cancels an order.

*Example:*

```js
ws.cancel({
  symbol: 'EOX.USDT',
  side: 'bid',
  id: '18446744073709551612',
  clientId: '1536867193329'
})
```

The request will be [signed locally](#signing) using the `eosjs` module.

*Sent payload:*

```
[0, 'oc', null, { meta: signed }]
```

`signed` is a signed payload for the `cancel` [action of the **exchange contract**](#abi).

#### `sunbeam.withdraw(data) => Promise`

- `data`
  - `currency <String>` The currency to withdraw, e.g. `BTC`
  - `amount <String>` The amount to withdraw
  - `to <String> (optional)` The account to withdraw to.

Withdraws tokens to a specified account. The account must be the same as
the account used with eosfinex.

Defaults to the account used for auth.

*Example:*

```js
ws.withdraw({
  currency: 'EUR',
  amount: '0.678'
})
```

The request will be [signed locally](#signing) using the `eosjs` module.

*Sent payload:*

```
[0, 'tx', null, { meta: signed }]
```

This request uses the general `tx` identifier for messages. `signed` is
a signed payload for the `withdraw` [action of the **exchange contract**](#abi).

#### `sunbeam.sweep(data) => Promise`

- `data`
  - `currency <String>` The currency to withdraw, e.g. `BTC`
  - `to <String> (optional)` The account to withdraw to.

Sweeps tokens to a specified account. The account must be the same as
the account used with eosfinex.

Defaults to the account used for auth.

*Example:*

```js
ws.sweep({
  currency: 'EUR'
})

// on success we receive a wallet update:
// [ '0', 'wu', [ 'exchange', 'EUR', 0, 0, null ] ]

// and the amount is transferred back to the deposit contract:
// $ ./cleos get currency balance efinextether testuser1431
// 100.00000000 EUR
```

*Sent payload:*

```
[0, 'tx', null, { meta: signed }]
```

This request uses the general `tx` identifier for messages. `signed` is
a signed payload for the `sweep` [action of the **exchange contract**](#abi).


#### `sunbeam.deposit(data) => Promise`
  - `data`
    - `currency <String>` The currency to deposit, e.g. `BTC`
    - `amount <String>` The amount to deposit

Deposits the desired amount to the exchange using the **token contract**.
Takes the user account used for auth.

*Example:*

```js
ws.deposit({
  currency: 'EUR',
  amount: '2'
})

// success:
// [ '0', 'wu', [ 'exchange', 'EUR', 2, 0, null ] ]
```

*Sent payload:*

```
[0, 'tx', null, { meta: signed }]
```

This request uses the general `tx` identifier for messages. `signed` is
a signed payload for the `sweep` action of the **token contract**.

The request will be [signed locally](#signing) using the `eosjs` module.

#### `sunbeam.subscribeOrderBook(pair)`
  - `pair <String>` The pair, i.e. `EOX.USDT`

Subscribe to orderbook updates for a pair. The format is `R0`: https://docs.bitfinex.com/v2/reference#ws-public-raw-order-books
The amount of entries is limited to 100 entries on the bid and ask side.

*Example:*

```js
ws.onOrderBook({ symbol: 'EOX.USDT' }, (ob) => {
  console.log('ws.onOrderBook({ symbol: "EOX.USDT" }')
  console.log(ob)
})

ws.onManagedOrderbookUpdate({ symbol: 'EOX.USDT' }, (ob) => {
  console.log('ws.onManagedOrderbookUpdate({ symbol: "EOX.USDT" }')
  console.log(ob)
})

// subscribe via:
// { event: 'subscribe', channel: 'book', symbol: 'EOX.USDT' }
ws.subscribeOrderBook('EOX.USDT')
```

*Sent Payload:*

```
{ event: 'subscribe', channel: 'book', symbol: 'EOX.USDT' }
```

*Example responses:*

```
// format
[PAIR,[ID,AMOUNT,PRICE], TIMESTAMP]

// snapshot:
["EOS.USDT",["263237",4.0921,-1.8913], 1565682279501]]

// update:
["EOS.USDT",["263237",4.0921,-1.8913], 1565682279520]
```

#### `sunbeam.subscribePublicTrades(pair)`
  - `pair <String>` The pair, i.e. `EOX.USDT`

Unsubscribe from public trade updates for a pair.

*Example:*

```js
ws.subscribePublicTrades('EOX.USDT')
```

*Sent Payload:*

```
{ event: 'subscribe', channel: 'trades', symbol: 'EOX.USDT' }
```

#### `sunbeam.unSubscribeOrderBook(pair)`
  - `pair <String>` The pair, i.e. `EOX.USDT`

Unsubscribe from orderbook updates for a pair.

*Example:*

```js
ws.unSubscribeOrderBook('EOX.USDT')
```

*Sent Payload:*

```
{
  event: 'unsubscribe',
  channel: 'book',
  symbol: 'EOX.USDT'
}
```

#### `sunbeam.subscribe(channel, ?opts)`
  - `channel <String>` The channel to subscribe to
  - `opts <Object>` Additional data to send


Subscribes to a Websocket channel.

Available channels:

```
book            orderbooks
reports         trade updates
wallets         wallet snapshots / updates
```

The channels `reports` and `wallets` are automatically subscribed on authentication
via Websocket.

*Example:*

```js
ws.subscribe('wallets', { account: 'testuser1431' })
```

*Sent Payload:*

```
{
  event: 'subscribe',
  channel: 'wallets',
  account: 'testuser1431'
}
```

#### `sunbeam.unsubscribe(channel, ?opts)`
  - `channel <String>` The channel to subscribe to
  - `opts <Object>` Additional data to send

Unsubscribes from a channel.

The channels `reports` and `wallets` are automatically subscribed on authentication
via Websocket.

*Example:*

```js
ws.unsubscribe('wallets', { account: 'testuser1431' })
```

*Sent Payload:*

```
{
  event: 'unsubscribe',
  channel: 'wallets',
  account: 'testuser1431'
}
```

#### Websocket API helper RPC calls

There are a few additional RPC calls that can help when writing your own
client.

##### Chain metadata - { event: 'chain' }

Returns metadata used for signing transactions via Websocket.

Format is:

```
[0, 'ci', [
  $headBlockTime,
  $lastIrreversibleBlockNumber,
  $chainId,
  $refBlockPrefix
]]
```

*Example:*

```js
ws.on('message', (m) => {
  console.log(m)
})

ws.send({ event: 'chain' })
```

*Example response:*

```
[ '0',
  'ci',
  [ '1557850696',
    9296555,
    'cf057bbfb72640471fd910bcb67639c22df9f92470936cddc1ade0e2f2e7dc4f',
    '372320450' ] ]
```

##### Trading pairs - { event: 'pa' }
<a id="trade-pairs" />

Returns available trading pairs.

*Example:*

```js
ws.on('message', (m) => {
  console.log(m)
})

ws.send({ event: 'pairs' })
```

*Example response:*

```
[ '0',
  'pa',
  [ 'PIQ.PUSDT', 'EOX.PUSDT', 'PEOS.PUSDT', 'PEMT.PUSDT' ] ]
```

### Managed State Updates

Usually the Bitfinex trading protocol will send a snapshot, and later just
updates, for performance reasons.

When you register a `managed` orderbook handler, the managed state component
will take care of parsing the snapshots update the state when partial updates arrive.

For every update, the full updated data is emitted.

#### `sunbeam.onManagedOrderbookUpdate(opts, handler)`
  - `opts <Object>`
    - `symbol <String>` The symbol to emit the orderbook update for, i.e. `EOX.USDT`
  - `handler <Function>` Called every time the state is updated

The input format is `R0`: https://docs.bitfinex.com/v2/reference#ws-public-raw-order-books

If you want to manage state on your own, our just need a stream of updates, use
the `onOrderBook` handler.

*Example:*

```js
ws.onManagedOrderbookUpdate({ symbol: 'EOX.USDT' }, (ob) => {
  console.log(ob)
})
ws.subscribeOrderBook('EOX.USDT')
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
    - `symbol <String>` The symbol to emit the public trade updates for, i.e. `EOX.USDT`
  - `handler <Function>` The callback called for every update

*Example:*

```js
ws.onPublicTradeUpdate({ symbol: 'EOX.USDT' }, (data) => {
  console.log('ws.onPublicTradeUpdate({ symbol: "EOX.USDT" }')
  console.log(data) // emits [ 'EOX.USDT', 'te', [ '3', 1537196302500, -0.9, 1 ] ]
})

ws.subscribePublicTrades('EOX.USDT')
```

Registered for `tu`, `te` messages via the corresponding channel for the symbol.


#### `sunbeam.onOrderBook(opts, handler)`
  - `opts <Object>`
    - `symbol <String>` The symbol to emit the orderbook update for, i.e. `EOX.USDT`
  - `handler <Function>` The callback called for every update

Just emits order updates and order snapshots without keeping or managing state.

*Example:*

```js
ws.onOrderBook({ symbol: 'EOX.USDT' }, (ob) => {
  console.log(ob)
})
ws.subscribeOrderBook('EOX.USDT')
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
sb.getManagedStateComponent('books', 'EOX.USDT')
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
