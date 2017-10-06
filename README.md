poloniex-api-node
=======
[![Build Status](https://travis-ci.org/dutu/poloniex-api-node.svg?branch=master)](https://travis-ci.org/dutu/poloniex-api-node) [![Dependency Status](https://dependencyci.com/github/dutu/poloniex-api-node/badge)](https://dependencyci.com/github/dutu/poloniex-api-node)


**poloniex-api-node** is a simple node.js wrapper for Poloniex REST and WebSocket (push) API.

REST API supports both Callback and Promise.

WebSocket API supports both the WAMP protocol (v1), and also Poloniex new WebSocket API (v2).

> While the legacy WAMP API (v1) is still the one officially documented by Poloniex, the new WebSocket API (v2) is faster, more reliable (and internally used by Poloniex).    

### Contents
* [Install](#install)
* [Quick examples](#quick-examples)
* [Usage](#usage)
	* Constructor
	* REST API
	* WebSocket API
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

### WebSocket API examples

Example (WebSocket API):

```js
const Poloniex = require('poloniex-api-node');
let poloniex = new Poloniex();

poloniex.subscribe('ticker');
poloniex.subscribe('BTC_ETH');

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

poloniex.webSocketOpen();
```

# Usage

## Constructor

### new Poloniex([key, secret,][options])

To access the private Poloniex API methods you must supply your API key id and key secret as the first two arguments. If you are only accessing the public API endpoints you can leave these two arguments out.

Default options:
```js
{
  socketTimeout: 60000,
  keepAlive: true
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

* `socketTimeout` - the number of milliseconds to wait for the server to send the response before aborting the request 
* `keepAlive` - keep open and reuse the underlying TCP connection
 

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

#### withdraw(currency, amount, address [, callback])

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


## Websocket API v1

### Methods

#### openWebSocket([options])

Opens WebSocket connection to Poloniex server.
If WebSocket connection is already open and `openWebSocket` is called again, the existing connection is closed and a new one is opened (equivalent to a full reset of the WebSocket connection). 

Event `'open'` is emitted when connection opens.

Example:
```js
let poloniex = new Poloniex();
poloniex.on('open', () => {
  console.log(`WebSocket connection has be opened.`);
});
poloniex.openWebSocket();
```

> Parameter `options` is optional and not yet used.

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
  "currencyPair": "BTC_PPC",
  "last": "0.00030724",
  "lowestAsk": "0.00030892",
  "highestBid": "0.00030563",
  "percentChange": "0.10533889",
  "baseVolume": "17.98936247",
  "quoteVolume": "59961.74951336",
  "isFrozen": 0,
  "24hrHigh": "0.00031999",
  "24hrLow": "0.00027796"
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

Please refer to [official Poloniex API documentation](https://poloniex.com/support/api/) for "Push API, Order Book and Trades" for detailed information on the data provided and its format.

Check https://poloniex.com/public?command=returnTicker for available currency pairs.

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
    "accountsRegistered": 1,
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

Example:
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

### Events

The following events can be emitted:
* `'open'`
* `'message'`
* `'close'`
* `'error'`

When a listener is registered using the `Poloniex.on()` method, that listener will be invoked every time the named event is emitted.

> **Important:** You have to set `error` handler otherwise your app will throw an `Error` and exit if `error` event will occur (see: [Node.js Error events](https://nodejs.org/api/events.html#events_error_events))

#### Event: `'open'`

Emitted when WebSocket connection is esablished.

#### Event: `'message'`

Emitted when an update on a subscribed channel is received.
See method `subscribe` for details on data received and its format.

#### Event: `'close'`

Emitted when WebSocket connection is closed.
See method `closeWebSocket` for details on data received and its format.

#### Event: `'error'`

Emitted when an error occurs.

Example:
```js
poloniex.on('error', (error) => {
  console.log(error);
});
```

## Websocket API v2

### Methods

#### openWebSocket([options])

Opens WebSocket connection to Poloniex server.
If WebSocket connection is already open and `openWebSocket` is called again, the existing connection is closed and a new one is opened (equivalent to a full reset of the WebSocket connection). 

Event `'open'` is emitted when connection opens.

Example:
```js
let poloniex = new Poloniex();
poloniex.on('open', () => {
  console.log(`WebSocket connection has be opened.`);
});
poloniex.openWebSocket();
```

> Parameter `options` is optional and not yet used.

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
  "currencyPair": "BTC_PPC",
  "last": "0.00030724",
  "lowestAsk": "0.00030892",
  "highestBid": "0.00030563",
  "percentChange": "0.10533889",
  "baseVolume": "17.98936247",
  "quoteVolume": "59961.74951336",
  "isFrozen": 0,
  "24hrHigh": "0.00031999",
  "24hrLow": "0.00027796"
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

Please refer to [official Poloniex API documentation](https://poloniex.com/support/api/) for "Push API, Order Book and Trades" for detailed information on the data provided and its format.

Check https://poloniex.com/public?command=returnTicker for available currency pairs.

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

Example:
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

### Events

The following events can be emitted:
* `'open'`
* `'message'`
* `'close'`
* `'error'`

> **Important:** You have to set `error` handler otherwise your app will throw an `Error` and exit if error event will occur (see: [Node.js Error events](https://nodejs.org/api/events.html#events_error_events))

#### Event: `'open'`

Emitted when WebSocket connection is esablished.

#### Event: `'message'`

Emitted when an update on a subscribed channel is received.
See method `subscribe` for details on data received and its format.

#### Event: `'close'`

Emitted when WebSocket connection is closed.
See method `closeWebSocket` for details on data received and its format.

#### Event: `'error'`

Emitted when an error occurs.

Example:
```js
poloniex.on('error', (error) => {
  console.log(error);
});
```

# Changelog

See detailed [Changelog](CHANGELOG.md)

# Contributors

* [dutu](https://github.com/dutu) (<dutu@protonmail.com>)
* [julesGoullee](https://github.com/julesGoullee) (<julesgoullee@gmail.com>)
* [Wallison Santos](https://github.com/wallybh) (<wallison@outlook.com>)
* [epdev](https://github.com/epdev)
* [BarnumD](https://github.com/BarnumD)

# License

[MIT](LICENSE)
