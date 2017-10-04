const debug = require('debug')('poloniex');
const crypto  = require('crypto');
const request = require('request');
const nonce = require('nonce')();
const autobahn = require('autobahn');
const EventEmitter = require('events');

const version = require('../package.json').version;
const PUBLIC_API_URL = 'https://poloniex.com/public';
const PRIVATE_API_URL = 'https://poloniex.com/tradingApi';
const WS_URI = 'wss://api.poloniex.com';
const WS2_URI = 'wss://api2.poloniex.com';
const USER_AGENT = `${require('../package.json').name} ${version}`;
const DEFAULT_SOCKETTIMEOUT = 60 * 1000;
const DEFAULT_KEEPALIVE = true;
const STRICT_SSL = true;

let processEvent = function processEvent(channelName, args, kwargs) {
  let data;
  let seq;
  switch (channelName) {
    case 'ticker': {
      data = {
        currencyPair: args[0],
        last: args[1],
        lowestAsk: args[2],
        highestBid: args[3],
        percentChange: args[4],
        baseVolume:args[5],
        quoteVolume: args[6],
        isFrozen: args[7],
        '24hrHigh': args[8],
        '24hrLow': args[9],
      };
      break;
    }

    default: {
      data = args;
      seq = typeof kwargs === 'object' && kwargs.seq;
    }
  }

  this.emit('message', channelName, data, seq);
};

class Poloniex extends EventEmitter {
  constructor(key, secret, options) {
    super();
    this.key = key;
    this.secret = secret;
    this.subscriptions = [];
    this._wsConnection = null;
    this._wsSession = null;

    if (typeof options === 'object') {
      this.options = options;
    }

    if (typeof key === 'object' && !secret && !options) {
      this.options = key;
      this.key = null;
    }
  }

  _getPrivateHeaders(parameters) {
    if (!this.key || !this.secret) {
      return null;
    }

    let paramString = Object.keys(parameters).map(function (param) {
      return encodeURIComponent(param) + '=' + encodeURIComponent(parameters[param]);
    }).join('&');

    let signature = crypto.createHmac('sha512', this.secret).update(paramString).digest('hex');
    return {
      Key: this.key,
      Sign: signature
    };
  }

  _request(options, callback) {
    if (!('headers' in options)) {
      options.headers = {};
    }

    options.json = true;
    options.headers['User-Agent'] = USER_AGENT;
    options.strictSSL = STRICT_SSL;
    options.timeout = this.options && this.options.socketTimeout || DEFAULT_SOCKETTIMEOUT;
    options.forever = this.options && this.options.hasOwnProperty('keepAlive') ? this.options.keepAlive : DEFAULT_KEEPALIVE;
    if (options.forever) {
      options.headers['Connection'] = 'keep-alive';
    }

    debug(`${options.url}, ${options.method}, ${JSON.stringify(options.method === 'GET' && options.qs || options.form)}`);
    request(options, function (error, response, body) {
      let err = error;
      if (!err && response.statusCode !== 200) {
        let errMsg = `Poloniex error ${response.statusCode}: ${response.statusMessage}`;
        if (typeof response.body === 'object' && response.body.hasOwnProperty('error')) {
          errMsg = `${errMsg}. ${response.body.error}`;
        }

        err =  new Error(errMsg);
      }

      if (!err && (typeof response.body === 'undefined' || response.body === null)) {
        err = new Error('Poloniex error: Empty response');
      }

      if (!err && body.error) {
        err = new Error(body.error);
      }

      if (!err) debug(`req: ${response.request.href}, resp: ${JSON.stringify(response.body)}`);
      callback(err, body);
    });
    return this;
  }

  _requestPromised(options) {
    if (!('headers' in options)) {
      options.headers = {};
    }

    options.json = true;
    options.headers['User-Agent'] = Poloniex.USER_AGENT;
    options.strictSSL = Poloniex.STRICT_SSL;
    options.timeout = this.options && this.options.socketTimeout || DEFAULT_SOCKETTIMEOUT;
    options.forever = this.options && this.options.hasOwnProperty('keepAlive') ? this.options.keepAlive : DEFAULT_KEEPALIVE;
    if (options.forever) {
      options.headers['Connection'] = 'keep-alive';
    }

    return new Promise((resolve, reject) => {
      debug(`${options.url}, ${options.method}, ${JSON.stringify(options.method === 'GET' && options.qs || options.form)}`);
      request(options, function (error, response, body) {
        let err = error;
        if (!err && response.statusCode !== 200) {
          let errMsg = `Poloniex error ${response.statusCode}: ${response.statusMessage}`;
          if (typeof response.body === 'object' && response.body.hasOwnProperty('error')) {
            errMsg = `${errMsg}. ${response.body.error}`;
          }

          err =  new Error(errMsg);
        }

        if (!err && (typeof response.body === 'undefined' || response.body === null)) {
          err = new Error('Poloniex error: Empty response');
        }

        if (!err && body.error) {
          err = new Error(body.error);
        }

        if (!err) {
          debug(`req: ${response.request.href}, resp: ${JSON.stringify(response.body)}`);
          resolve(body);
        } else {
          reject(err);
        }
      });
    });
  }

  // Make a public API request
  _public(command, parameters, callback) {
    Object.keys(parameters).forEach((key) => {
      if (typeof parameters[key] === 'function') {
        throw new Error('Invalid parameters');
      }
    });

    let param = parameters;
    param.command = command;
    let options = {
      method: 'GET',
      url: PUBLIC_API_URL,
      qs: param,
    };
    if(callback) {
      return this._request(options, callback);
    } else {
      return this._requestPromised(options);
    }
  }

  // Make a private API request
  _private(command, parameters, callback) {
    Object.keys(parameters).forEach((key) => {
      if (typeof parameters[key] === 'function') {
        throw new Error('Invalid parameters');
      }
    });

    let param = parameters;
    param.command = command;
    param.nonce = nonce(16);
    let options = {
      method: 'POST',
      url: PRIVATE_API_URL,
      form: param,
      headers: this._getPrivateHeaders(param),
    };
    if (options.headers) {
      if (callback) {
        return this._request(options, callback);
      } else {
        return this._requestPromised(options);
      }
    } else {
      let err = new Error('Error: API key and secret required');
      if (callback) {
        return callback(err, null);
      } else {
        return Promise.reject(err);
      }
    }
  }

  // Public API Methods

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

  returnTradeHistory(currencyPair, start, end, limit, callback) {
    let parameters = {
      currencyPair,
    };
    if (start) parameters.start = start;
    if (end) parameters.end = end;
    if (typeof limit === 'function') {
      callback = limit;
    } else {
      if (limit) parameters.limit = limit;
    }
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

  returnMyTradeHistory(currencyPair, start, end, limit, callback) {
    let parameters = {
      currencyPair,
    };
    if (start) parameters.start = start;
    if (end) parameters.end = end;
    if (typeof limit === 'function') {
      callback = limit;
    } else {
      if (limit) parameters.limit = limit;
    }
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

  // PUSH API
  openWebSocket() {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new autobahn.Connection({
      url: WS_URI,
      realm: 'realm1',
      max_retries: -1,            // Maximum number of reconnection attempts. Unlimited if set to -1 (default: 15)
      initial_retry_delay: 1,     // Initial delay for reconnection attempt in seconds  (default: 1.5)
      max_retry_delay: 5,         // Maximum delay for reconnection attempts in seconds (default: 300)
      retry_delay_growth: 1.5,    // The growth factor applied to the retry delay between reconnection attempts (default: 1.5)
    });

    this.ws.onopen = (session, details) => {
      this.wsSession = session;
      this.subscriptions.forEach((subscription) => {
        let processMarketEvent = processEvent.bind(this, subscription.channelName);
        this.wsSession.subscribe(subscription.channelName, processMarketEvent)
          .then((channelSubscription) => {
            subscription.channelSubscription = channelSubscription;
          })
      });
      this.emit('open', details);
    };

    this.ws.onclose = (reason, details) => {
      this.ws = null;
      this.emit('close', reason, details);
    };

    this.ws.open();
  }

  subscribe(channelName) {
    let subscription = this.subscriptions.find(element => element.channelName === channelName);
    if (subscription) {
      return;
    }

    subscription = {
      channelName,
      channelSubscription: null,
    };
    this.subscriptions.push(subscription);

    if (this.wsSession) {
      let processMarketEvent = processEvent.bind(this, subscription.channelName);
      this.wsSession.subscribe(subscription.channelName, processMarketEvent)
        .then(
          (channelSubscription) => {
            subscription.channelSubscription = channelSubscription;
          },
          (autobahnError) => {
            this.emit('error', autobahnError)
          });
    }
  }

  unsubscribe(channelName) {
    let subscriptionIndex = this.subscriptions.findIndex(element => element.channelName === channelName);
    if (subscriptionIndex > -1) {
      if (this.wsSession && this.subscriptions[subscriptionIndex].channelSubscription  instanceof autobahn.Subscription) {
        this.wsSession.unsubscribe(this.subscriptions[subscriptionIndex].channelSubscription).then(
          (gone) => {
          },
          (autobahnError) => {
            this.emit('error', autobahnError)
          });
      }
      this.subscriptions.splice(subscriptionIndex, 1);
    }
  }

  closeWebSocket() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = Poloniex;
