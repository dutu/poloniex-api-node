poloniex-api-node
=======
![Dependencies Status](https://david-dm.org/dutu/poloniex-api-node.svg)


**poloniex-api-node** is a simple node.js wrapper for the Poloniex REST API

See full documentation at [https://poloniex.com/support/api/](https://poloniex.com/support/api/)


# Install

    npm install poloniex-api-node

# Usage

### Poloniex([keyId, keySecret])

To access the private Poloniex API methods you must supply your key id and key secret as the first two arguments. If you are only accessing the public API endpoints you can leave these two arguments out.

Example:

```js
const Poloniex = require('poloniex-api-node');
let poloniex = new Poloniex('your_key', 'your_secret');
	
poloniex.returnLoanOrders('BTC', null, function (err, ticket) {
    if (!err)
	    console.log(ticker);
});
```




# Methods

For details about the API endpoints see [https://poloniex.com/support/api/](https://poloniex.com/support/api/)

**Note:** For calling a method with optional parameters, the parameters, when not wanted, need to be passed as `null`  


### Callbacks

The arguments passed to the callback function for each method are:
1. An error or `null` if no error occurred.
2. An object containing the data returned by the Poloniex API.


## Public API Methods


### returnTicker(callback)

Example:

```js
poloniex.returnTicker(function(err, ticket) {});
```


### return24Volume(callback)

### returnOrderBook(currencyPair, depth, callback)

### returnTradeHistory(currencyPair, start, end, callback)

### returnChartData(currencyPair, period, start, end, callback)

### returnCurrencies(callback)

### returnLoanOrders(currency, limit, callback)


## Trading API Methods

### returnBalances(callback)

### returnCompleteBalances(account, callback)

### returnDepositAddresses(callback)

### generateNewAddress(currency, callback)

### returnDepositsWithdrawals(start, end, callback)

### returnOpenOrders(currencyPair, callback)

### returnMyTradeHistory(currencyPair, start, end, callback)

### returnOrderTrades(orderNumber, callback)

### buy(currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly, callback)

### sell(currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly, callback)

### cancelOrder(orderNumber, callback)

### moveOrder(orderNumber, rate, amount, immediateOrCancel, postOnly, callback)

### withdraw(currency, amount, address, callback)

### returnFeeInfo(callback)

### returnAvailableAccountBalances(account, callback)

### returnTradableBalances(callback)

### transferBalance(currency, amount, fromAccount, toAccount, callback)

### returnMarginAccountSummary(callback)

### marginBuy(currencyPair, rate, amount, lendingRate, callback)

### marginSell(currencyPair, rate, amount, lendingRate, callback)

### getMarginPosition(currencyPair, callback)

### closeMarginPosition(currencyPair, callback)

### createLoanOffer(currency, amount, duration, autoRenew, lendingRate, callback)

### cancelLoanOffer(orderNumber, callback)

### returnOpenLoanOffers(callback)

### returnActiveLoans(callback)

### returnLendingHistory(start, end, limit, callback)

### toggleAutoRenew(orderNumber, callback)


# ChangeLog

See detailed [ChangeLog](CHANGELOG.md)

# License

[MIT](LICENSE)