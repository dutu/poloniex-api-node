poloniex-api-node
=======
[![Tests](https://github.com/dutu/poloniex-api-node/actions/workflows/nodejs-ci.yml/badge.svg)](https://github.com/dutu/poloniex-api-node/actions/workflows/nodejs-ci.yml) 


**poloniex-api-node** is a simple node.js wrapper for Poloniex REST and WebSocket API.

### Contents
* [Changelog](#changelog)
* [Install](#install)
* [Quick examples](#quick-examples)
* [Usage](#usage)
	* Constructor
	* REST API
	* WebSocket API
* [Contributors](#contributors)
* [License](#license)

# Changelog

See detailed [GitHub Releases](https://github.com/dutu/poloniex-api-node/releases)

## Breaking changes introduced in version 3.0.0

Legacy Poloniex API is no longer supported.
Poloniex has announced that **the legacy API is slated to be decommissioned on Jan 31st, 2023**.
Module supporting the legacy API has been moved to [branch legacy_API](https://github.com/dutu/poloniex-api-node/tree/legacy_API), and it is not longer maintained. 

# Install

    npm install --save poloniex-api-node

# Quick examples

### REST API example

```js
import Poloniex from 'poloniex-api-node'
let poloniex = new Poloniex('your_api_key', 'your_api_secret')

const tradesHistory = poloniex.getTradesHistory({ limit: 1000, symbols: 'BTC_USDT' })
		.then((result) => console.log(result))
		.catch((err) => console.log(err))
```

### WebSocket API examples

Example (WebSocket API):

```js
import Poloniex from 'poloniex-api-node'
let poloniex = new Poloniex('your_api_key', 'your_api_secret')


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

poloniex.openWebSocket();
```

# Usage

## Constructor

* `new Poloniex({ apiKey, apiSecret })`

To access the private Poloniex API methods you must supply your API key id and key secret. If you are only accessing the public API endpoints, you can leave the parameter out.

Examples:

```js
const poloniex = new Poloniex({ apiKey: 'myKey', apiSecret: 'mySecret' })
```

## REST API

### Properties
* `apiCallRateLimits` - API call rate limits for endpoints sets (resource-intensive and non-resource-intensive private and public endpoints)

	Example output:
	```javascript
  {
    riPub: 10,
    nriPub: 200,
    nriPriv: 50,
    riPriv: 10
  }
  ```

* `apiCallRates` - Current call rate for resource-intensive and non-resource-intensive private and public API calls

	Example output:
	```javascript
  {
    riPub: 8,
    nriPub: 100,
    nriPriv: 5,
    riPriv: 7
  }
  ```

See https://docs.poloniex.com/#rate-limits.



### Methods

All methods accept one object parameter, which is used to pass all request parameters for the API call.


[Official Poloniex API documentation](https://docs.poloniex.com/) lists all valid `Request Parameters` for API calls. 
When a `Request Parameter` needs to be included, a property with the exact same name needs to be added to the object parameter.


All methods return a promise.

Example:

```js
const tradesHistory = await poloniex.getTradesHistory({ limit: 1000, symbols: 'BTC_USDT' })
```

An optional property `getApiCallRateInfo` can be specified. When set to `true` the corresponding API call is not sent to the exchange, instead the current API call rate is returned. See [rate limits](https://docs.poloniex.com/#rate-limits).

Example:

```js
const callRateInfo = await poloniex.getTradesHistory({ limit: 1000, symbols: 'BTC_USDT', getApiCallRateInfo: true })
```
Example output: 
```javascript
[
 'riPriv', // id of the API endpoind set (can be 'riPub', 'nriPub', 'riPriv' or 'nriPriv')  
 2,        // current API call rate
 10        // API call rate limit
]
```

### Public API Methods

#### Reference Data
* [`getSymbols`](https://docs.poloniex.com/#public-endpoints-reference-data-symbol-information) - get symbols and their trade info
* [`getCurrencies`](https://docs.poloniex.com/#public-endpoints-reference-data-currency-information) - get supported currencies
* [`getTimestamp`](https://docs.poloniex.com/#public-endpoints-reference-data-system-timestamp) - get current server time

#### Market Data
 * [`getPrices`](https://docs.poloniex.com/#public-endpoints-market-data-prices) - get the latest trade price for symbols
 * [`getMarkPrice`](https://docs.poloniex.com/#public-endpoints-market-data-mark-price) - get the latest mark price for cross margin symbols
 * [`getMarkPriceComponents`](https://docs.poloniex.com/#public-endpoints-market-data-mark-price-components) - get components of the mark price for a given symbol
 * [`getOrderBook`](https://docs.poloniex.com/#public-endpoints-market-data-order-book) - get the order book for a given symbol
 * [`getCandles`](https://docs.poloniex.com/#public-endpoints-market-data-candles) - returns OHLC for a symbol at given timeframe (interval)
 * [`getTrades`](https://docs.poloniex.com/#public-endpoints-market-data-trades) - returns a list of recent trades
 * [`getTicker`](https://docs.poloniex.com/#public-endpoints-market-data-ticker) - returns ticker in last 24 hours for all symbols

#### Margin
 * [`getCollateralInfo`](https://docs.poloniex.com/#public-endpoints-margin-collateral-info) - get collateral information for currencies
 * [`getBorrowRatesInfo`](https://docs.poloniex.com/#public-endpoints-margin-borrow-rates-info) - get borrow rates information for all tiers and currencies


### Private API Methods
#### Accounts
 * [`getAccountsInfo`](https://docs.poloniex.com/#authenticated-endpoints-accounts-account-information) - get a list of all accounts of a use
 * [`getAccountsBalances`](https://docs.poloniex.com/#authenticated-endpoints-accounts-all-account-balances) - get a list of accounts of a user with each account’s id, type and balances
 * [`getAccountsActivity`](https://docs.poloniex.com/#authenticated-endpoints-accounts-account-activity) - get a list of activities such as airdrop, rebates, staking, credit/debit adjustments, and other (historical adjustments)
 * [`accountsTransfer`](https://docs.poloniex.com/#authenticated-endpoints-accounts-accounts-transfer) - transfer amount of currency from an account to another account for a user
 * [`getAccountsTransferRecords`](https://docs.poloniex.com/#authenticated-endpoints-accounts-accounts-transfer-records) - get a list of transfer records of a user
 * [`getFeeInfo`](https://docs.poloniex.com/#authenticated-endpoints-accounts-fee-info) - get fee rate

#### Subaccounts
 * [`getSubaccountsInfo`](https://docs.poloniex.com/#authenticated-endpoints-subaccounts-subaccount-information) - get a list of all the accounts within an Account Group for a user
 * [`getSubaccountsBalances`](https://docs.poloniex.com/#authenticated-endpoints-subaccounts-subaccount-balances) - get balances information by currency and account type
 * [`subaccountsTransfer`](https://docs.poloniex.com/#authenticated-endpoints-subaccounts-subaccount-transfer) - transfer amount of currency from an account and account type to another account and account type among the accounts in the account group
 * [`getSubaccountsTransferRecords`](https://docs.poloniex.com/#authenticated-endpoints-subaccounts-subaccount-transfer-records) - get a list of transfer records of a user

#### Wallets
 * [`getDepositAddresses`](https://docs.poloniex.com/#authenticated-endpoints-wallets-deposit-addresses) - get deposit addresses for a user
 * [`getWalletsActivityRecords`](https://docs.poloniex.com/#authenticated-endpoints-wallets-wallets-activity-records) - get deposit and withdrawal activity history
 * [`createNewCurrencyAddress`](https://docs.poloniex.com/#authenticated-endpoints-wallets-new-currency-address) - Create a new address for a currency
 * [`withdrawCurrency`](https://docs.poloniex.com/#authenticated-endpoints-wallets-withdraw-currency) - immediately places a withdrawal for a given currency

#### Margin
 * [`getMarginAccountInfo`](https://docs.poloniex.com/#authenticated-endpoints-margin-account-margin) - get account margin information
 * [`getMarginBorrowStatus`](https://docs.poloniex.com/#authenticated-endpoints-margin-borrow-status) - get borrow status of currencies
 * [`getMarginMaxSize`](https://docs.poloniex.com/#authenticated-endpoints-margin-maximum-buy-sell-amount) - get maximum and available buy/sell amount for a given symbol

#### Orders
 * [`createOrder`](https://docs.poloniex.com/#authenticated-endpoints-orders-create-order) - create an order for an account
 * [`createBatchOrders`](https://docs.poloniex.com/#authenticated-endpoints-orders-create-multiple-orders) - create multiple orders via a single request
 * [`replaceOrder`](https://docs.poloniex.com/#authenticated-endpoints-orders-cancel-replace-order) - cancel an existing active order, new or partially filled, and place a new order
 * [`getOpenOrders`](https://docs.poloniex.com/#authenticated-endpoints-orders-open-orders) - get a list of active orders for an account
 * [`getOrderDetails`](https://docs.poloniex.com/#authenticated-endpoints-orders-order-details) - get an order’s status
 * [`cancelOrder`](https://docs.poloniex.com/#authenticated-endpoints-orders-cancel-order-by-id) - cancel an active order
 * [`cancelBatchOrders`](https://docs.poloniex.com/#authenticated-endpoints-orders-cancel-multiple-orders-by-ids) - batch cancel one or many active orders in an account by IDs
 * [`cancelAllOrders`](https://docs.poloniex.com/#authenticated-endpoints-orders-cancel-all-orders) - cancel all orders in an account
 * [`setKillSwitch`](https://docs.poloniex.com/#authenticated-endpoints-orders-kill-switch) - set a timer that cancels all regular and smartorders after the timeout has expired
 * [`getKillSwitchStatus`](https://docs.poloniex.com/#authenticated-endpoints-orders-kill-switch-status) - get status of kill switch

#### Smart Orders
 * [`createSmartOrder`](https://docs.poloniex.com/#authenticated-endpoints-smart-orders-create-order) - create a smart order for an account
 * [`replaceSmartOrder`](https://docs.poloniex.com/#authenticated-endpoints-smart-orders-cancel-replace-order) - cancel an existing untriggered smart order and place a new smart order
 * [`getSmartOpenOrders`](https://docs.poloniex.com/#authenticated-endpoints-smart-orders-open-orders) - get a list of (pending) smart orders for an account
 * [`getSmartOrderDetails`](https://docs.poloniex.com/#authenticated-endpoints-smart-orders-order-details) - get a smart order’s status
 * [`cancelSmartOrder`](https://docs.poloniex.com/#authenticated-endpoints-smart-orders-cancel-order-by-id) - cancel a smart order
 * [`cancelBatchSmartOrders`](https://docs.poloniex.com/#authenticated-endpoints-smart-orders-cancel-multiple-orders-by-id) - batch cancel one or many smart orders in an account by IDs
 * [`cancelAllSmartOrders`](https://docs.poloniex.com/#authenticated-endpoints-smart-orders-cancel-all-orders) - batch cancel all smart orders in an account

#### Order History
 * [`getOrdersHistory`](https://docs.poloniex.com/#authenticated-endpoints-order-history-orders-history) - get a list of historical orders in an account
 * [`getSmartOrdersHistory`](https://docs.poloniex.com/#authenticated-endpoints-order-history-smart-orders-history) - get a list of historical smart orders in an account

#### Trades
 * [`getTradesHistory`](https://docs.poloniex.com/#authenticated-endpoints-trades-trade-history) - get a list of all trades for an account
 * [`getOrderTrades`](https://docs.poloniex.com/#authenticated-endpoints-trades-trades-by-order-id) - get a list of all trades for an order specified by its orderId


## Websocket API

### Methods

### Events

# Contributors

This project exists thanks to all the people who contribute.

* [dutu](https://github.com/dutu) (<dutu@protonmail.com>)
* [julesGoullee](https://github.com/julesGoullee) (<julesgoullee@gmail.com>)
* [zymnytskiy](https://github.com/zymnytskiy)
* [Wallison Santos](https://github.com/wallybh) (<wallison@outlook.com>)
* [Denis Bezrukov](https://github.com/anthrax63)
* [BarnumD](https://github.com/BarnumD)
* [zunderbolt](https://github.com/zunderbolt)
* [aloysius-pgast](https://github.com/aloysius-pgast)
* [SeanRobb](https://github.com/SeanRobb)
* [Robert Valmassoi](https://github.com/valmassoi) (<rvalmassoi@protonmail.com>)
* [epdev](https://github.com/epdev)
* [standup75](https://github.com/standup75) (<me@standupweb.net>)
* [kevflynn](https://github.com/kevflynn) ([Kevin](http://www.kevflynn.com))
* [Alexey Marunin](https://github.com/alexeymarunin)

# License

[MIT](LICENSE)
