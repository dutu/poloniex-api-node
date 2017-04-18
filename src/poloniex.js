import { crypto } from 'crypto';
import { request } from 'request';
import { Nonce } from 'nonce';
import { Debug } from 'debug';

import pkg from '../package.json';

const debug = Debug('poloniex');
const nonce = Nonce();
const PUBLIC_API_URL = 'https://poloniex.com/public';
const PRIVATE_API_URL = 'https://poloniex.com/tradingApi';
const USER_AGENT = `${pkg.name} ${pkg.version}`;
// STRICT_SSL can be set to `false` to avoid `Error: CERT_UNTRUSTED`. Use with caution. Will be removed in future, once this is resolved.
const STRICT_SSL = true;

// Generate headers signed by this user's key and secret. The secret is encapsulated and never exposed
const _getPrivateHeaders = function _getPrivateHeaders(key, secret, parameters) {
  if (!key || !secret) {
    return null;
  }

  let paramString = Object.keys(parameters).map(function(param) {
    return encodeURIComponent(param) + '=' + encodeURIComponent(parameters[param]);
  }).join('&');

  let signature = crypto.createHmac('sha512', secret).update(paramString).digest('hex');
  return {
    Key: key,
    Sign: signature
  };
};

// Make an API request
const _request = function _request(options, callback) {
  if (!('headers' in options)) {
    options.headers = {};
  }

  options.json = true;
  options.headers['User-Agent'] = USER_AGENT;
  options.strictSSL = STRICT_SSL;
  options.timeout = 3000;

  debug(`${options.url}, ${options.method}, ${JSON.stringify(options.method === 'GET' && options.qs || options.form)}`);
  request(options, function(error, response, body) {
    let err = error;
    if (!err && response.statusCode !== 200) {
      err =  new Error(`Poloniex error ${response.statusCode}: ${response.body.error || response.body}`);
    }
    if (!err && typeof body === 'undefined' || body === null) {
      err = new Error('Poloniex error: Empty response');
    }
    if (!err && body.error) {
      err = new Error(body.error);
    }
    if (!err) debug(`req: ${response.request.href}, resp: ${response.body.error}`);
    callback(err, body);
  });
  return this;
};

export class Poloniex {
  constructor(key, secret) {
    this.key = key;
    this.secret = secret;
  }

  // Make a public API request
  _public(command, parameters, callback) {
    let param = parameters;
    param.command = command;
    let options = {
      method: 'GET',
      url: PUBLIC_API_URL,
      qs: param,
    };
    return _request(options, callback);
  }

  // Make a private API request
  _private(command, parameters, callback) {
    let param = parameters;
    param.command = command;
    param.nonce = nonce(16);
    let options = {
      method: 'POST',
      url: PRIVATE_API_URL,
      form: param,
      headers: _getPrivateHeaders(this.key, this.secret, param),
    };
    if (options.headers) {
      return _request(options, callback);
    } else {
      let err = new Error('Error: API key and secret required');
      return callback(err, null);
    }
  }

  returnTicker(callback) {
    let parameters = {};
    return this._public('returnTicker', parameters, callback);
  }

  return24Volume(callback) {
    let parameters = {};
    return this._public('return24hVolume', parameters, callback);
  }

  returnOrderBook(currencyPair, depth, callback) {
    let parameters = {
      currencyPair,
    };
    if (depth) parameters.depth = depth;
    return this._public('returnOrderBook', parameters, callback);
  }

  returnTradeHistory(currencyPair, start, end, callback) {
    let parameters = {
      currencyPair,
    };
    if (start) parameters.start = start;
    if (end) parameters.end = end;
    return this._public('returnTradeHistory', parameters, callback);
  }

  returnChartData(currencyPair, period, start, end, callback) {
    let parameters = {
      currencyPair,
      period,
      start,
      end,
    };
    return this._public('returnChartData', parameters, callback);
  }

  returnCurrencies(callback) {
    let parameters = {};
    return this._public('returnCurrencies', parameters, callback);
  }

  returnLoanOrders(currency, limit, callback) {
    let parameters = {
      currency,
    };
    if (limit) parameters.limit = limit;
    return this._public('returnLoanOrders', parameters, callback);
  }

  // Trading API Methods
  returnBalances(callback) {
    let parameters = {};
    return this._private('returnBalances', parameters, callback);
  }

  returnCompleteBalances(account, callback) {
    let parameters = {};
    if (account) parameters.account =account;
    return this._private('returnCompleteBalances', parameters, callback);
  }

  returnDepositAddresses(callback) {
    let parameters = {};
    return this._private('returnDepositAddresses', parameters, callback);
  }

  generateNewAddress(currency, callback) {
    let parameters = {
      currency,
    };
    return this._private('generateNewAddress', parameters, callback);
  }

  returnDepositsWithdrawals(start, end, callback) {
    let parameters = {
      start,
      end,
    };
    return this._private('returnDepositsWithdrawals', parameters, callback);
  }

  returnOpenOrders(currencyPair, callback) {
    let parameters = {
      currencyPair,
    };
    return this._private('returnOpenOrders', parameters, callback);
  }

  returnMyTradeHistory(currencyPair, start, end, callback) {
    let parameters = {
      currencyPair,
    };
    if (start) parameters.start = start;
    if (end) parameters.end = end;
    return this._private('returnTradeHistory', parameters, callback);
  }

  returnOrderTrades(orderNumber, callback) {
    let parameters = {
      orderNumber,
    };
    return this._private('returnOrderTrades', parameters, callback);
  }

  buy(currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly, callback) {
    let parameters = {
      currencyPair,
      rate,
      amount,
    };
    if (fillOrKill) parameters.fillOrKill = fillOrKill;
    if (immediateOrCancel) parameters.immediateOrCancel = immediateOrCancel;
    if (postOnly) parameters.postOnly = postOnly;
    return this._private('buy', parameters, callback);
  }

  sell(currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly, callback) {
    let parameters = {
      currencyPair,
      rate,
      amount,
    };
    if (fillOrKill) parameters.fillOrKill = fillOrKill;
    if (immediateOrCancel) parameters.immediateOrCancel = immediateOrCancel;
    if (postOnly) parameters.postOnly = postOnly;
    return this._private('sell', parameters, callback);
  }

  cancelOrder(orderNumber, callback) {
    let parameters = {
      orderNumber,
    };
    return this._private('cancelOrder', parameters, callback);
  }

  moveOrder(orderNumber, rate, amount, immediateOrCancel, postOnly, callback) {
    let parameters = {
      orderNumber,
      rate,
    };
    if (amount) parameters.amount = amount;
    if (postOnly) parameters.postOnly = postOnly;
    if (immediateOrCancel) parameters.immediateOrCancel = immediateOrCancel;
    return this._private('moveOrder', parameters, callback);
  }

  withdraw(currency, amount, address, callback) {
    let parameters = {
      currency,
      amount,
      address,
    };
    return this._private('withdraw', parameters, callback);
  }

  returnFeeInfo(callback) {
    let parameters = {};
    return this._private('returnFeeInfo', parameters, callback);
  }

    returnAvailableAccountBalances(account, callback) {
    let parameters = {};
    if (account) parameters.account = account;
    return this._private('returnAvailableAccountBalances', parameters, callback);
  }

    returnTradableBalances(callback) {
    let parameters = {};
    return this._private('returnTradableBalances', parameters, callback);
  }

  transferBalance(currency, amount, fromAccount, toAccount, callback) {
    let parameters = {
      currency,
      amount,
      fromAccount,
      toAccount,
    };
    return this._private('transferBalance', parameters, callback);
  }

  returnMarginAccountSummary(callback) {
    let parameters = {};
    return this._private('returnMarginAccountSummary', parameters, callback);
  }

  marginBuy(currencyPair, rate, amount, lendingRate, callback) {
    let parameters = {
      currencyPair,
      rate,
      amount,
    };
    if (lendingRate) parameters.lendingRate = lendingRate;
    return this._private('marginBuy', parameters, callback);
  }

  marginSell(currencyPair, rate, amount, lendingRate, callback) {
    let parameters = {
      currencyPair,
      rate,
      amount,
    };
    if (lendingRate) parameters.lendingRate = lendingRate;
    return this._private('marginSell', parameters, callback);
  }

  getMarginPosition(currencyPair, callback) {
    let parameters = {
      currencyPair,
    };
    return this._private('getMarginPosition', parameters, callback);
  }

  closeMarginPosition(currencyPair, callback) {
    let parameters = {
      currencyPair,
    };
    return this._private('closeMarginPosition', parameters, callback);
  }

  createLoanOffer(currency, amount, duration, autoRenew, lendingRate, callback) {
    let parameters = {
      currency,
      amount,
      duration,
      autoRenew,
      lendingRate,
    };
    return this._private('createLoanOffer', parameters, callback);
  }

  cancelLoanOffer(orderNumber, callback) {
    let parameters = {
      orderNumber,
    };
    return this._private('cancelLoanOffer', parameters, callback);
  }

  returnOpenLoanOffers(callback) {
    let parameters = {};
    return this._private('returnOpenLoanOffers', parameters, callback);
  }

  returnActiveLoans(callback) {
    let parameters = {};
    return this._private('returnActiveLoans', parameters, callback);
  }

  returnLendingHistory(start, end, limit, callback) {
    let parameters = {
      start,
      end,
    };
    if (limit) parameters.limit = limit;
    return this._private('returnLendingHistory', parameters, callback);
  }

  toggleAutoRenew(orderNumber, callback) {
    let parameters = {
      orderNumber,
    };
    return this._private('toggleAutoRenew', parameters, callback);
  }
}
