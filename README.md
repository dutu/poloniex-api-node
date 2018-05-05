poloniex-api-node
=======
[![Build Status](https://travis-ci.org/dutu/poloniex-api-node.svg?branch=master)](https://travis-ci.org/dutu/poloniex-api-node) [![Dependency Status](https://dependencyci.com/github/dutu/poloniex-api-node/badge)](https://dependencyci.com/github/dutu/poloniex-api-node) [![npm](https://img.shields.io/npm/dm/poloniex-api-node.svg)](https://www.npmjs.com/package/poloniex-api-node)



**poloniex-api-node** is a simple node.js wrapper for Poloniex REST and WebSocket API.

REST API supports both Callback and Promise.

WebSocket API supports both the WAMP protocol (v1) and the new WebSocket API (v2).

> The legacy WAMP push API (v1) is currently the WebSocket API officially documented. Lately, it is not stable and Poloniex servers are not handling the API properly due high load.
>
> The new WebSocket API (v2) is not yet officially documented, however its functionality is much faster and reliable. WebSocket API (v2) is also internally used by Poloniex.


### Contents
* [Install](#install)
* [Quick examples](#quick-examples)
* [Usage](#usage)
	* Constructor
	* REST API
	* WebSocket API (version 1 and version 2)
* [Changelog](#changelog)
* [Contributors](#contributors)
* [License](#license)

# Install

    npm install --save poloniex-api-node

# Quick examples

> See additional examples in [examples folder](https://github.com/dutu/poloniex-api-node/tree/master/examples)

### REST API examples

> When calling the REST API methods, Callback is always the last parameter. When callback parameter is not present, the method will return a Promise.

Example 1 (REST API using Callback):

```js
const Poloniex = require('poloniex-api-node');
let poloniex = new Poloniex();

poloniex.returnTicker((err, ticker) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log(ticker);
  }
});
```

Example 2 (REST API using Callback):

```js
const Poloniex = require('poloniex-api-node');
let poloniex = new Poloniex();

poloniex.returnTicker(function (err, ticker) {
  if (err) {
    console.log(err.message);
  } else {
    console.log(ticker);
  }
});
```

Example 3 (REST API using Promise):

```js
const Poloniex = require('poloniex-api-node');
let poloniex = new Poloniex();

poloniex.returnTicker().then((ticker) => {
  console.log(ticker);
}).catch((err) => {
  console.log(err.message);
});
```

Example 4 (set `socketTimeout` to 15 seconds):

```js
const Poloniex = require('poloniex-api-node');
let poloniex = new Poloniex('your_key', 'your_secret', { socketTimeout: 15000 });

poloniex.returnLoanOrders('BTC', null, function (err, ticker) {
  if (!err) console.log(ticker);
});
```

Example 4 (set `nonce` to custom function):

```js
const Poloniex = require('poloniex-api-node');
let poloniex = new Poloniex('your_key', 'your_secret', { nonce: () => new Date().time() });

poloniex.returnLoanOrders('BTC', null, function (err, ticker) {
  if (!err) console.log(ticker);
});
```

### WebSocket API examples

Example (WebSocket API):

```js
const Poloniex = require('poloniex-api-node');
let poloniex = new Poloniex();

poloniex.subscribe('ticker');
poloniex.subscribe('BTC_ETC');

poloniex.on('message', (channelName, data, seq) => {
  if (channelName === 'ticker') {
    console.log(`Ticker: ${data}`);
  }

  if (channelName === 'BTC_ETC') {
    console.log(`order book and trade updates received for currency pair ${channelName}`);
    console.log(`data sequence number is ${seq}`);
  }
});

poloniex.on('open', () => {
  console.log(`Poloniex WebSocket connection open`);
});

poloniex.on('close', (reason, details) => {
  console.log(`Poloniex WebSocket connection disconnected`);
});

poloniex.on('error', (error) => {
  console.log(`An error has occured`);
});

poloniex.openWebSocket({ version: 2 });
```

# Usage

## Constructor

### new Poloniex([key, secret,][options])

To access the private Poloniex API methods you must supply your API key id and key secret as the first two arguments. If you are only accessing the public API endpoints you can leave these two arguments out.

Default options:
```js
{
  socketTimeout: 60000,
  keepAlive: true,
  nonce: nonce(16),
  headers: { 'User-Agent': 'poloniex-api-node *version*' }
}
```

Examples:

```js
let poloniex;
poloniex = new Poloniex();
poloniex = new Poloniex({ socketTimeout: 10000 });
poloniex = new Poloniex('myKey', 'mySecret');
poloniex = new Poloniex('myKey', 'mySecret', { socketTimeout: 130000 });
```

#### Available options

* `socketTimeout` - the number of milliseconds to wait for the server to send the response before aborting the request (REST API)
* `keepAlive` - keep open and reuse the underlying TCP connection (REST API)
* `proxy` - proxy to be used for requests (REST API)
* `nonce` - custom function that returns an unique and ever increasing number
* `agent` - sets specific http.Agent for REST API calls and WebSocket connection. (It is useful for using socks proxy to avoid the 403 error with CAPTCHA. See [#20](https://github.com/dutu/poloniex-api-node/issues/20#issuecomment-359789499))
* `headers` - HTTP Headers, such as User-Agent, can be set in the object. See [https://github.com/request/request#custom-http-headers](https://github.com/request/request#custom-http-headers "the Request module")


## REST API

For details about the API endpoints see full documentation at [https://poloniex.com/support/api/](https://poloniex.com/support/api/)

**Important:** When calling an API method with optional parameters, the parameters, when not wanted, need to be passed as `null`.  

#### Callback and Promise support

Both Callback and Promise are supported.

Callback is always the last parameter. When callback parameter is not present the method will return a Promise.


#### Callbacks

The arguments passed to the callback function for each method are:
1. An error or `null` if no error occurred.
2. An object containing the data returned by the Poloniex API.


### Public API Methods


#### returnTicker([callback])

Examples:

```js
poloniex.returnTicker((err, ticker) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log(ticker);
  }
});


poloniex.returnTicker().then((ticker) => {
  console.log(ticker);
}).catch((err) => {
  console.log(err.message);
});
```

#### return24Volume([callback])

#### returnOrderBook(currencyPair, depth [, callback])

> Parameter `depth` is not documented in the official Poloniex API documentation. The parameter can be set to `null` or an integer value.

#### returnTradeHistory(currencyPair, start, end, limit [, callback])

> Parameter `limit` is not documented in the official Poloniex API documentation. The parameter can be set to `null` or an integer value.

#### returnChartData(currencyPair, period, start, end [, callback])

#### returnCurrencies([callback])

#### returnLoanOrders(currency, limit [, callback])

Examples:

```js
poloniex.returnLoanOrders('BTC', null, (err, loanOrders) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log(loanOrders);
  }
});

poloniex.returnLoanOrders('BTC', null).then((loanOrders) => {
  console.log(loanOrders);
}).catch((err) => {
  console.log(err.message);
});
```

### Trading API Methods

#### returnBalances([callback])

```js
poloniex.returnBalances(function (err, balances) {
  if (err) {
    console.log(err.message);
  } else {
    console.log(balances);
  }
});

poloniex.returnBalances().then((balances) => {
  console.log(balances);
}).catch((err) => {
  console.log(err.message);
});
```

#### returnCompleteBalances(account [, callback])

#### returnDepositAddresses([callback])

#### generateNewAddress(currency [, callback])

#### returnDepositsWithdrawals(start, end [, callback])

#### returnOpenOrders(currencyPair [, callback])

#### returnMyTradeHistory(currencyPair, start, end, limit [, callback])

#### returnOrderTrades(orderNumber [, callback])

#### buy(currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly [, callback])

#### sell(currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly [, callback])

#### cancelOrder(orderNumber [, callback])

#### moveOrder(orderNumber, rate, amount, immediateOrCancel, postOnly [, callback])

#### withdraw(currency, amount, address, paymentId [, callback])

> Parameter `paymentId` is used for certain withdrawals (e.g. XMR) and when not wanted/needed should be passed as `null`.

#### returnFeeInfo([callback])

#### returnAvailableAccountBalances(account [, callback])

#### returnTradableBalances([callback])

#### transferBalance(currency, amount, fromAccount, toAccount [, callback])

#### returnMarginAccountSummary([callback])

#### marginBuy(currencyPair, rate, amount, lendingRate [, callback])

#### marginSell(currencyPair, rate, amount, lendingRate [, callback])

#### getMarginPosition(currencyPair [, callback])

#### closeMarginPosition(currencyPair [, callback])

#### createLoanOffer(currency, amount, duration, autoRenew, lendingRate [, callback])

#### cancelLoanOffer(orderNumber [, callback])

#### returnOpenLoanOffers([callback])

#### returnActiveLoans([callback])

#### returnLendingHistory(start, end, limit [, callback])

#### toggleAutoRenew(orderNumber [, callback])


## Websocket API (version 1 and version 2)

This module implements both the legacy WAMP push API (v1) and the new WebSocket API (v2).

Although the module facilitates the usage of v1 and v2 in a similar way, Poloniex implementation is completely different.

The legacy WAMP push API (v1) is currently the WebSocket API officially documented. Lately, it is not stable and Poloniex servers are not handling the API properly due high load.

The new WebSocket API (v2) is not yet officially documented, however its functionality is much faster and reliable. WebSocket API (v2) is also internally used by Poloniex.

### Events

A listener is registered using the `Poloniex.on()` method (since `Poloniex` class inherits the `EventEmitter`) and the listener will be invoked every time the named event is emitted.

Example:
```js
let poloniex = new Poloniex();
poloniex.on('open', () => {
  console.log(`WebSocket connection is open.`);
});
```

The following events can be emitted:
* `'open'`
* `'message'`
* `'close'`
* `'error'`
* `'heartbeat'`

#### Event: `'open'`

Emitted when WebSocket connection is established.

#### Event: `'message'`

Emitted when an update on a subscribed channel is received.
See method `subscribe` for details on data received and its format.

#### Event: `'close'`

Emitted when WebSocket connection is closed.
See method `closeWebSocket` for details on data received and its format.

#### Event: `'error'`

Emitted when an error occurs.

> **Important:** You have to set `error` listener otherwise your app will throw an `Error` and exit if `error` event will occur (see: [Node.js Error events](https://nodejs.org/api/events.html#events_error_events))

Example:
```js
poloniex.on('error', (error) => {
  console.log(error);
});
```

#### Event: `'heartbeat'` (v2 only)

 Emitted if there is no update for more than 60 seconds


### Methods

#### openWebSocket([options])

Opens WebSocket connection to Poloniex server.
If WebSocket connection is already open and `openWebSocket` is called again, the existing connection is closed and a new one is opened (equivalent to a full reset of the WebSocket connection).

Event `'open'` is emitted when connection is established.

Default options:
```js
{
  version: 1
}
```

To use the new WebSocket API (v2), pass parameter option as `{ version: 2 }`

Example:
```js
let poloniex = new Poloniex();
poloniex.on('open', () => {
  console.log(`WebSocket connection has be opened.`);
});
poloniex.openWebSocket({ version: 2 });
```

#### subscribe(channelName)

In order to receive updates over WebSocket, subscribe to following channels:
* `'ticker'`
* currencyPair (examples: `'BTC_ETH'`, `'BTC_XMR'`)
* `'footer'`

When an update on the subscribed channel is received `Poloniex` object emits the event `'message'`.

 > You can subscribe to a channel either before or after the WebSocket connection is opened with `openWebSocket`. If WebSocket connection is already open, the subscription is activated immediately. If WebSocket connection is not open yet, the `subscribe` is registering the subscription; all registered connections will be activated when `openWebSocket` is issued.

##### Channel: `'ticker'`

Provides ticker updates.

Example:
```js
let poloniex = new Poloniex();
poloniex.subscribe('ticker');
poloniex.on('message', (channelName, data) => {
  if (channelName === 'ticker') {
    console.log(`Ticker: ${data}`);
  }
});
poloniex.openWebSocket();
```
Ticker updates will be in following format:

```js
{
  "currencyPair": "BTC_XRP",
  "last": "0.00005432",
  "lowestAsk": "0.00005440",
  "highestBid": "0.00005432",
  "percentChange": "-0.02878598",
  "baseVolume": "2862.99229490",
  "quoteVolume": "52479031.35647538",
  "isFrozen": 0,
  "24hrHigh": "0.00005598",
  "24hrLow": "0.00005264"
}
```


##### Channel: currencyPair (examples: `'BTC_ETH'`, `'BTC_XMR'`)

Provides order book and trade updates.
Subscribe to the desired currencyPair, e.g. `'BTC_ETC'`, to receive order book and trade updates.

Example:
```js
let poloniex = new Poloniex();
poloniex.openWebSocket();
poloniex.subscribe('BTC_ETH');
poloniex.on('message', (channelName, data, seq) => {
  if (channelName === 'BTC_ETH') {
    console.log(`order book and trade updates received for currency pair ${channelName}`);
    console.log(`data sequence number is ${seq}`);
  }
});
```

There are four types of messages (described below)
* `orderBook` (v2 only)
* `orderBookModify`
* `orderBookRemove`
* `newTrade`

######  orderBook (v2 only)

Provides a snapshot of the order book for the subscribed currency pair. The message is emited imediatelly after subscription to the currency pair is activated.

The data for `orderBook` snapshot is provided in the following format:

```js
[
  {
    "type": "orderBook",
    "data": {
      "asks": {
        "0.06964408": "0.16219637",
        "0.06964599": "10.40000000",
        "0.06964600": "33.11470000",
        "0.06965590": "0.00427159",
      },
      "bids": {
        "0.06963545": "14.03591058",
        "0.06960000": "16.53833125",
        "0.06957303": "3.46440626",
        "0.06957300": "33.11720000",
     }
    }
  }
]
```

> This message type is only valid for the new WebSocket API (v2). When WAMP API (v1) is used, the orderBook snapshot has to be retrieved using REST API method `returnOrderBook`.


###### orderBookModify and orderBookRemove

There are two types of order book updates `orderBookModify` and `orderBookRemove`, provided in the following formats:

```js
[
  {
    "type": "orderBookModify",
    "data": {
      "type": "bid",
      "rate": "0.06961000",
      "amount": "33.11630000"
    }
  }
]
```

```js
[
  {
    "type": "orderBookRemove",
    "data": {
      "type": "bid",
      "rate": "0.06957300",
      "amount": "0.00000000"
    }
  }
]
```

Updates of type `orderBookModify` can be either additions to the order book or changes to existing entries. The value of `amount` indicates the new total amount on the books at the given rate — in other words, it replaces any previous value, rather than indicates an adjustment to a previous value.

Each `message` event will pass the parameter `seq`, indicating the a sequence number. In order to keep your order book consistent, you will need to ensure that messages are applied in the order of their sequence numbers, even if they arrive out of order.

Several order book and trade history updates will often arrive in a single message. Be sure to loop through the entire array, otherwise you will miss some updates.

######  newTrade

Trade history updates are provided in the following format:
```js

[
  {
    "type": "newTrade",
    "data": {
      "tradeID": "34816326",
      "type": "sell",
      "rate": "0.07006406",
      "amount": "0.14341700",
      "total": "0.01004838",
      "date": "2017-10-06T22:37:52.000Z"
    }
  }
]
```

> **Important:** Several order book and trade history updates will often arrive in a single message. Be sure to loop through the entire array, otherwise you will miss some updates.


##### Channel: `'footer'`

Provides other info updates.

Example:
```js
let poloniex = new Poloniex();
poloniex.subscribe('footer');
poloniex.on('message', (channelName, data) => {
  if (channelName === 'footer') {
    console.log(data);
  }
});
poloniex.openWebSocket();
```

The updates will be in following format:

```js
[
  {
    "serverTime": "2017-10-04 12:55",
    "usersOnline": 18438,
    "volume": {
      "BTC": "13014.809",
      "ETH": "3725.101",
      "XMR": "354.380",
      "USDT": "24511953.302"
    }
  }
]
```

> Channel `'footer'` is not documented in the official Poloniex API documentation.


#### unsubscribe(channelName)

Unsubscribes a previously established channel subscription. Once unsubscribed there will be no more channel updates received.

Example:
```js
let poloniex = new Poloniex();
poloniex.openWebSocket();
poloniex.subscribe('BTC_ETH');
poloniex.on('message', (channelName, data, seq) => {
  if (channelName === 'BTC_ETH') {
    console.log(`order book and trade updates received for currency pair ${channelName}`);
    console.log(`data sequence number is ${seq}`);
  }
});
poloniex.unsubscribe('BTC_ETH');
```


#### closeWebSocket()

Closes WebSocket connection previously opened.
Event `'close'` is emitted when connection closes.

Example (v1):
```js
let poloniex = new Poloniex();
poloniex.on('open', () => {
  poloniex.closeWebSocket();
});
poloniex.on('close', (reason, details) => {
  console.log(`WebSocket connection has been closed`);
});
poloniex.openWebSocket();
```

Example (v2):
```js
let poloniex = new Poloniex();
poloniex.on('open', () => {
  poloniex.closeWebSocket();
});
poloniex.on('close', (reason, code) => {
  console.log(`WebSocket connection has been closed`);
});
poloniex.openWebSocket();
```

# Changelog

See detailed [Changelog](CHANGELOG.md)

# Contributors

* [dutu](https://github.com/dutu) (<dutu@protonmail.com>)
* [aloysius-pgast](https://github.com/aloysius-pgast)
* [julesGoullee](https://github.com/julesGoullee) (<julesgoullee@gmail.com>)
* [kevflynn](https://github.com/kevflynn) ([Kevin](http://www.kevflynn.com))
* [Denis Bezrukov](https://github.com/anthrax63)
* [Wallison Santos](https://github.com/wallybh) (<wallison@outlook.com>)
* [epdev](https://github.com/epdev)
* [BarnumD](https://github.com/BarnumD)
* [Robert Valmassoi](https://github.com/valmassoi) (<rvalmassoi@protonmail.com>)
* [zymnytskiy](https://github.com/zymnytskiy)
* [zunderbolt](https://github.com/zunderbolt)
* [SeanRobb](https://github.com/SeanRobb)

# License

[MIT](LICENSE)
