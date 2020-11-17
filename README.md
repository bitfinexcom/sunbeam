[![Build Status](https://travis-ci.org/bitfinexcom/sunbeam.svg?branch=master)](https://travis-ci.org/bitfinexcom/sunbeam)

# Sunbeam

eosfinex Websocket adapter for Node and the browser.

We designed the eosfinex Websocket API with both speed and compatibility in mind.
It is a subset of the existing Bitfinex API v2, with modifications
for on-chain trading. Existing API v2 users should be able to start with
only a small changeset to their existing clients.

Sunbeam is the current reference implementation of the Websocket API client. It
interacts with the contract ABI. For more details, see the
[signing section](#signing).

This readme covers both the Sunbeam API and explains how it interacts behind
the scenes with the server.

The main difference between the Bitfinex WS API and eosfinex's API is the
signing of messages. For eosfinex, we have to sign actions with our eosjs
private key. A signed transaction is also used for subscriptions to trade,
order and wallet snapshots and updates.

```js
const Sunbeam = require('sunbeam')

// Browser usage: import into browsers
import Sunbeam from 'sunbeam/dist'
```

## Paper Trading

On paper trading tokens are generally prefixed by `P`. So `BTC` becomes
`PBTC`. The only exception is the resource token `EOX`. For a list of
available trading pairs, see [trade-pairs](#trading-pairs).

## Examples

### Node.js

Example of the Websocket client usage: [example-ws.js](example-ws.js)


Run with:
```
node example-ws.js
```


## Websocket API

You can see all API calls in [example-ws.js](example-ws.js) or [example-ual.js](example-ual.js).
Sunbeam support private key or [UAL](https://github.com/EOSIO/universal-authenticator-library) for authentication.

### `new Sunbeam(client, opts) => sunbeam`
  - `client <Object>`
    - `rpc` official eosjs rpc class instance
    - `api` official eosjs Api class instance
  - `opts <Object>`
    - `urls <Object>` Websocket transports
      - `pub <String>` Public transport
      - `priv <String>`Private transport
      - `aux <String>` Aux transport
    - `eos <Object>` options passed to Eos client for signing transactions
      - `expireInSeconds <Number>` Expiration time for signed tx. 7 days by default
      - `httpEndpoint <String|null>` an Eos node HTTP endpoint, used to get the contract abi, if abi not passed via options.
      - `exchangeContract <String|null>` name of the used exchange contract, defaults to `efinexchange`
    - `auth` Auth options
      - `keys` use default signing
        - `keyProvider <String>` your key, used to sign transactions
        - `account <String>` accountname to use for the key
        - `permission <String>` permission level to use for the account
      - `ual <Object>` UAL options if UAL is used for signing
        - `user <String>` Authenticated UAL user
    - `state <Object>` Options passed to state components
      - `transform <Object>` transformation options (keyed objects or array format)
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

const httpEndpoint = 'https://api.eosfinex.com'

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
  urls: {
    pub: 'wss://api.bitfinex.com/ws/2',
    priv: 'wss://api.eosfinex.com/ws'
  },
  eos: {
    expireInSeconds: 7 * 24 * 60 * 60, // 7 days
    httpEndpoint, // Used to get metadata for signing transactions
    exchangeContract: 'eosfinexeos1', // Name of the exchange contract
    auth: {
      ual: {
        user: '', // UAL user object
      },
    },
  },
  state: {
    transform: {
      orderbook: { keyed: true },
      wallet: {},
      orders: {}
    }
  }
}

const ws = new Sunbeam(client, opts)
```
In order to start trading it is required to sign up for the platform at [eosfinex.com](https://www.eosfinex.com/) and accept [terms of services](https://www.eosfinex.com/legal/exchange/terms).

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
Before you can run it, make sure to configure your environment:

```sh
cp config/example-ws.config.json.example config/example-ws.config.json

vim config/example-ws.config.json
```

or see [example-scatter.js](example-scatter.js) on the in-code configuration example.

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
 account: <username>,
 meta: <signed>
}
```

Where `<signed>` is a signed transaction for the `validate` action.

*Important:* to be able to trade, you have to sign up for the platform and accept the terms of service at [eosfinex.com](https://www.eosfinex.com/).

#### `sunbeam.getSignedTx(?user) => Promise`

  - `user <Object>` optional user object. If not defined, the data provided in the constructor will be used or retrieved from Scatter

Signs a transaction that can be used for login on the WS server for custom auth flows.

Example:

```js
const { Serialize } = require('eosjs')

const user = {
  authorization: {
    authorization: "testuser1114@active"
  },
  account: "testuser1114",
  permission: "active"
}

const signed = await ws.getSignedTx(user)
const serializedTransaction = api.serializeTransaction(signed)
const authTxHex = Serialize.arrayToHex(serializedTransaction)
const authTxPayload = {
  t: authTxHex,
  s: signed.signatures[0]
}

const history = await fetch(moonbeamUrl + '/v1/history', {
  method: 'POST',
  body: JSON.stringify({
    auth: authTxPayload,
    data: { limit: 100 }
  }),
  headers: { 'Content-Type': 'application/json' }
}).then(res => res.json())

console.log(JSON.stringify(history, null, 2))
```

#### `sunbeam.logoutScatter() => Promise`

Forgets scatter identity (if scatter is used for auth).

#### `sunbeam.place(order) => Promise`
  - `order <Object>`
    - `symbol <String>` Token pair to trade for
    - `amount <String>` Amount to buy/sell
    - `type <String>` Order type, `EXCHANGE MARKET`, `EXCHANGE LIMIT`, `EXCHANGE STOP`, `EXCHANGE FOK`, `EXCHANGE IOC`
    - `price <String>` Price for orders except market orders
    - `cid <Number>` Every order must have a unique id assigned from the client, defaults to current timestamp
    - `gid <Number>` Group id for the order, optional
    - `flags <Number>` See [flags list](#list-of-available-flags)
    - `tif <Datetime string> or <Number>` Time-In-Force: datetime for automatic order cancellation (ie. `2020-01-01 10:45:23`). *Applicable to `EXCHANGE LIMIT` orders only.*
    `tif` may be an integer value representing the number of milliseconds since January 1, 1970, or a string value representing a date ([see more here](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse#Date_Time_String_Format)). **NOTE:** if no timezone is passed, client timezone will be implied. 

Creates an order compatible with the contract ABI, pre-signs it and sends it
to the Websocket endpoint.

To be able to identify the order, a client **MUST** send a custom client id with it
that must be unique to the clients orders.

##### Price deviation

The following Websocket message is sent on authentication and contains the maximum possible 
price deviation from the best price when placing an order`{ event: 'pl', val: 0.1 }`.
For example, if the best price is 10 and deviation is 0.1, you won't be able to place a buy order for the price 
less than 10 - 10 * 0.1 = 9. 
If the price in the `order` exceeds the deviation, an error event will be generated.

##### List of available flags

Some flags are abstracted by Sunbeam. Here is a full list of available flags:

```
Flag            Type    Value   Description
-------------------------------------------------------------------------------------------------------------------------------------------------------------------
Hidden          int     64      The hidden order option ensures an order does not appear in the order book; thus does not influence other market participants.
Close           int     512     Close position if position present.
Reduce Only     int     1024    Ensures that the executed order does not flip the opened position.
Post Only       int     4096    The post-only limit order option ensures the limit order will be added to the order book and not match with a pre-existing order.
```
<a id="signing" />
Behind the scenes Sunbeam uses the exchange contract ABI to sign the transaction.
The ABI is publicly available via `cleos` or curl:

```
curl --request POST \
  --url https://api.eosfinex.com/v1/chain/get_abi \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --data '{"account_name":"eosfinexeos1"}'
```

After signing, the transaction is sent to the Websocket server:

```js
const signed = {
  "expiration": "2020-05-10T18:17:13.000",
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

// payload sent to the server:
[0, 'on', null, {
                      cid,
                      type,
                      symbol,
                      price,
                      amount,
                      flags,
                      meta: <transaction data>
                 }]
```


*Example:*

```js

const order = {
  symbol: pair,
  price: '8100',
  amount: '-0.01',
  type: 'EXCHANGE LIMIT',
  cid: '1332'
}
ws.place(order)
```

The request will be signed locally using the `eosjs` module.

*Sent payload:*

```
[0, 'on', null, {
                     cid,
                     type,
                     symbol,
                     price,
                     amount,
                     flags,
                     meta: <transaction data>
                }]
```

`<transaction data>` is a signed transaction payload in array notation for the `place` [action of the **exchange contract**](#signing).

#### `sunbeam.cancel(data) => Promise`

  - `data`
    - `id <String>` The id returned from the contract on placement

Cancels an order.

*Example:*

```js
ws.cancel({ id: '18446744073709551612' })
```

*Sent payload:*

```
[0, 'oc', null, { id }]
```

#### `sunbeam.withdraw(data) => Promise`

- `data` - an Object or Array of Objects with the following properties
  - `currency <String>` The currency to withdraw, e.g. `BTC`
  - `amount <String>` The amount to withdraw
  - `memo <String> (optional)` Additional note

Withdraws tokens to the account used for authentication.

A transaction is created, signed using `eosjs client` that was passed at Sunbeam instantiation, and pushed to the chain.

A single transaction may hold several withdrawals.

Transaction data and push result are returned.

*Example:*

```js
const { txResult, txData } = await ws.withdraw({
  currency: 'EUR',
  amount: '0.678'
})

// txData - array of objects: { currency, amount }
// txResult - data returned from `eosjs.api.transact(..)`
```

The request will be [signed locally](#signing) using the `eosjs` module.

#### `sunbeam.deposit(data) => Promise`
  - `data` - an Object or Array of Objects with the following properties
    - `currency <String>` The currency to deposit, e.g. `BTC`
    - `amount <String>` The amount to deposit
    - `to <String> (optional)` The receiver. Defaults to `exchangeContract` from the configuration object
    - `memo <String> (optional)` Additional note

Deposits the desired amount to the exchange.
Takes the user account used for auth.

A transaction is created, signed using `eosjs client` passed at Sunbeam instantiation, and pushed to the chain.

A single transaction may hold several deposits.

Transaction data and push result are returned.

*Example:*

```js
const { txResult, txData } = await ws.deposit({
  currency: 'EUR',
  amount: '2'
})

// txData - array of objects: { currency, amount, to }
// txResult - data returned from `eosjs.api.transact(..)`
```

The request will be [signed locally](#signing) using the `eosjs` module.

#### `sunbeam.subscribe(transport, channel, ?opts)`
  - `transport <String>` The Websocket transport to use (`priv`, `pub`, `aux`)
  - `channel <String>` The channel name to subscribe to
  - `opts <Object>` Additional data to send


Subscribes to a Websocket channel.

Available channels for `priv`:

```
reports         trade updates
wallets         wallet snapshots / updates
```

The channels `reports` and `wallets` are automatically subscribed on authentication
via Websocket.

*Example:*

```js
ws.subscribe('priv', 'wallets', { account: 'testuser1431' })
```

*Sent Payload:*

```
{
  event: 'subscribe',
  channel: 'wallets',
  account: 'testuser1431'
}
```

Channel `book` is available for `pub` and represents orderbook information. 
See [bitfinex docs](https://docs.bitfinex.com/reference#ws-public-books) for more details.

#### `sunbeam.unsubscribe(transport, channel, ?opts)`
  - `transport <String>` The Websocket transport to use (`priv`, `pub`, `aux`)
  - `channel <String>` The channel name or channel id to unsubscribe from
  - `opts <Object>` Additional data to send

Unsubscribes from a channel.

The channels `reports` and `wallets` are automatically subscribed on authentication
via Websocket.

*Example:*

```js
ws.unsubscribe('priv', 'wallets', { account: 'testuser1431' })

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

ws.send('priv', { event: 'chain' })
```
or
```js
const meta = await ws.requestChainMeta('priv')
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

##### Trading pairs - { event: 'si' }
<a id="trading-pairs" />
Returns available trading pairs and their properties.

*Example:*

```js
ws.on('message', (m) => {
  console.log(m)
})

ws.send('priv', { event: 'symbols' })
```

*Example response:*

```
[
  0,
  'si',
  [
    {
      pair: 'tEOSUST',
      price_precision: 5,
      initial_margin: '0.0',
      minimum_margin: '0.0',
      maximum_order_size: '100000.0',
      minimum_order_size: '1',
      expiration: 'NA',
      margin: 0
    },
    {
      pair: 'tBTCUSD',
      price_precision: 5,
      initial_margin: '0.0',
      minimum_margin: '0.0',
      maximum_order_size: '100000.0',
      minimum_order_size: '1',
      expiration: 'NA',
      margin: 0
    },
    {
      pair: 'tBTCUST',
      price_precision: 5,
      initial_margin: '0.0',
      minimum_margin: '0.0',
      maximum_order_size: '100000.0',
      minimum_order_size: '1',
      expiration: 'NA',
      margin: 0
    }
  ]
]
```

### Managed State Updates

Usually the Bitfinex trading protocol will send a snapshot, and later just
updates, for performance reasons.

When you register a `managed` orderbook handler, the managed state component
will take care of parsing the snapshots update the state when partial updates arrive.

For every update, the full updated data is emitted.

*Orderbook updates come for the orders of authenticated user.
Public orderbook data is available via Bitfinex Websocket connection.*

#### `sunbeam.onManagedOrderbook(opts, handler)`
  - `opts <Object>`
    - `symbol <String>` The symbol to emit the orderbook update for, i.e. `tBTCUST`
  - `handler <Function>` Called every time the state is updated

The input format is `R0`: see [bitfinex docs](https://docs.bitfinex.com/reference#ws-public-raw-books) for more details

If you want to manage state on your own, our just need a stream of updates, use
the `onOrderbook` handler.

*Example:*

```js
const pair = 'tBTCUST'

ws.onManagedOrderbook({ symbol: pair }, (ob) => {
  console.log(`ws.onManagedOrderbook({ symbol: ${pair} })`)
  console.log(ob)

  ws.unsubscribeOrderbook(pair)
})
```

Registered for messages from the corresponding book channel (received on subscribe).

#### `sunbeam.onManagedWallet(opts, handler)`
  - `opts <Object>`
  - `handler <Function>` Called every time the state is updated

*Example:*

```js
ws.onManagedWallet({}, (mw) => {
  console.log('ws.onManagedWallet')
  console.log(mw)
})

ws.auth()
```

Registered for `ws`, `wu` messages via channel `0`.
Channel is automatically subscribed by the API when doing an auth.

#### `sunbeam.onManagedOrders(filter, handler)`
  - `opts <Object>`
  - `handler <Function>` Called every time the state is updated

*Example:*

```js
ws.onManagedOrders({}, (orders) => {
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
  console.log('ws.onWallet')
  console.log(wu)
})

ws.auth()
```

Registered for `ws`, `wu` messages via channel `0`.
Channel is automatically subscribed by the API when doing an auth.

#### `sunbeam.onOrders(opts, handler)`
  - `opts <Object>`
      `?symbol <String>` optional: filter by pair
  - `handler <Function>` The callback called for every update

*Example:*

```js
const pair = 'tBTCUST'

ws.onOrders({}, (data) => {
  console.log('ws.onOrders({})')
  console.log(data)
})

// filter enabled
ws.onOrders({ symbol: pair }, (data) => {
  console.log(`ws.onOrders({ symbol: ${pair} })`)
  console.log(data)
})

ws.auth()
```

Registered for `os`, `on`, `ou`, `oc` messages via channel `0`.

#### `sunbeam.onPrivateTrades(opts, handler)`
  - `opts <Object>`
  - `handler <Function>` The callback called for every update


Called when an own, submitted order matches.

*Example:*

```js
ws.onPrivateTrades({}, (data) => {
  console.log('ws.onPrivateTrades({})')
  console.log('private trade', data) // emits [ 'ETH.USD', 'te', [ '3', 1537196302500, -0.9, 1 ] ]
})

ws.auth()
```

Registered for `tu`, `te` messages via channel `0`.

#### `sunbeam.onPublicTrades(opts, handler)`
  - `opts <Object>`
    - `?symbol <String>` optional: the symbol to emit the public trade updates for, i.e. `tBTCUST`
  - `handler <Function>` The callback called for every update

*Example:*

```js
const pair = 'tBTCUST'

ws.onPublicTrades({}, (data) => {
  console.log(`ws.onPublicTrades({})`)
  console.log('public trade', data)
})

ws.onPublicTrades({ symbol: pair }, (data) => {
  console.log(`ws.onPublicTrades({ symbol: ${pair} })`)
  console.log('public trade', data)
})

ws.subscribePublicTrades('tBTCUST')
```

Registered for `tu`, `te` messages via the corresponding channel for the symbol.


#### `sunbeam.onOrderbook(opts, handler)`
  - `opts <Object>`
    - `symbol <String>` The symbol to emit the orderbook update for, i.e. `tBTCUST`
  - `handler <Function>` The callback called for every update

Just emits order updates and order snapshots without keeping or managing state.

*Example:*

```js
const pair = 'tBTCUST'

ws.onOrderbook({ symbol: pair }, (ob) => {
  console.log(`ws.onOrderbook({ symbol: ${pair} })`)
  console.log(ob)
})

ws.subscribeOrderbook(pair)
```

Registered for messages from the corresponding book channel (received on subscribe).

## Standalone Managed State Helper

Sunbeam can take care of managing state snapshots for you, and keeps them up to date when the API sends updates.
Sometimes you may want to interact with Sunbeam's managed state. They are exposed through `this.state`

```js

ws.state
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
