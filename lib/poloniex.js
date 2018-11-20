const debug = require('debug')('poloniex');
const crypto  = require('crypto');
const request = require('request');
const nonce = require('nonce')();
const EventEmitter = require('events');
const WebSocket = require('ws');
const Big = require('big.js');

const version = require('../package.json').version;
const USER_AGENT = `${require('../package.json').name} ${version}`;
const PUBLIC_API_URL = 'https://poloniex.com/public';
const PRIVATE_API_URL = 'https://poloniex.com/tradingApi';
const DEFAULT_SOCKETTIMEOUT = 60 * 1000;
const DEFAULT_KEEPALIVE = true;
const STRICT_SSL = true;
const WS2_URI = 'wss://api2.poloniex.com';
const ws2SubscriptionToChannelIdMap = {
  accountNotifications: 1000,
  trollbox: 1001,
  ticker: 1002,
  volume: 1003,
  heartbeat: 1010,
};

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

    case 'volume': {
      data = args[0];
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
    // add custom headers only if they are not already defined
    if (this.options !== undefined && this.options.headers !== undefined) {
      for (let h in this.options.headers) {
        if (this.options.headers.hasOwnProperty(h) && options.headers[h] === undefined) {
          options.headers[h] = this.options.headers[h];
        }
      }
    }

    options.headers['User-Agent'] = options.headers['User-Agent'] || USER_AGENT;
    options.strictSSL = STRICT_SSL;
    options.timeout = this.options && this.options.socketTimeout || DEFAULT_SOCKETTIMEOUT;
    options.forever = this.options && this.options.hasOwnProperty('keepAlive') ? this.options.keepAlive : DEFAULT_KEEPALIVE;
    if (options.forever) {
      options.headers['Connection'] = options.headers['Connection'] || 'keep-alive';
    }

    if (this.options && this.options.hasOwnProperty('proxy')) {
      options.proxy = this.options.proxy;
    }

    if (this.options && this.options.hasOwnProperty('agent')) {
      options.agent = this.options.agent;
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
    // add custom headers only if they are not already defined
    if (this.options !== undefined && this.options.headers !== undefined) {
      for (let h in this.options.headers) {
        if (this.options.headers.hasOwnProperty(h) && options.headers[h] === undefined) {
          options.headers[h] = this.options.headers[h];
        }
      }
    }

    options.headers['User-Agent'] = options.headers['User-Agent'] || USER_AGENT;
    options.strictSSL = Poloniex.STRICT_SSL;
    options.timeout = this.options && this.options.socketTimeout || DEFAULT_SOCKETTIMEOUT;
    options.forever = this.options && this.options.hasOwnProperty('keepAlive') ? this.options.keepAlive : DEFAULT_KEEPALIVE;
    if (options.forever) {
      options.headers['Connection'] = options.headers['Connection'] || 'keep-alive';
    }

    if (this.options && this.options.hasOwnProperty('proxy')) {
      options.proxy = this.options.proxy;
    }

    if (this.options && this.options.hasOwnProperty('agent')) {
      options.agent = this.options.agent;
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
    param.nonce = this.options && this.options.nonce ? this.options.nonce() : nonce(16);
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

  returnOrderStatus(orderNumber, callback) {
    let parameters = {
      orderNumber,
    };
    return this._private('returnOrderStatus', parameters, callback);
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

  withdraw(currency, amount, address, paymentId, callback) {
    let parameters = {
      currency,
      amount,
      address,
    };
    if (paymentId) {
      if (typeof paymentId === 'function') {
        callback = paymentId;
      } else {
        parameters.paymentId = paymentId;
      }
    }
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

  // WebSocket API
  openWebSocket(options) {
    let currencies;
    let markets;
    this.returnCurrencies()
      .then(c => {
        const keys = Object.keys(c);
        let byID = {};
        keys.forEach(currency => byID[c[currency].id] = { currency: currency });
        currencies = {byID};
        return this.returnTicker();
      })
      .then((currencyPairs) => {
        const keys = Object.keys(currencyPairs);
        let byID = {};
        keys.forEach(currencyPair => {
          byID[currencyPairs[currencyPair].id] = {
            currencyPair,
          }
        });
        markets = {byID};

        if (this.options && this.options.hasOwnProperty('agent')) {
          options.agent = this.options.agent;
        }

        this.ws = new WebSocket(WS2_URI, options);

        this.ws.onopen = (e) => {
          this.ws.keepAliveId = setInterval(() => {
            this.ws.send('.')
          }, 60000);
          this.subscriptions.forEach((subscription) => {
            let channelId = ws2SubscriptionToChannelIdMap[subscription.channelName] || subscription.channelName;
            let params = {command: 'subscribe', channel: channelId};
            if (channelId === 1000) {
              if (!this.key || !this.secret) {
                return this.emit('error', 'API key and secret required');
              }

              params.key = this.key;
              params.payload = `nonce=${this.options && this.options.nonce ? this.options.nonce() : nonce(16)}`;
              params.sign = crypto.createHmac('sha512', this.secret).update(params.payload).digest('hex');
            }

            this.ws.send(JSON.stringify(params));
          });
          this.emit('open', e);
        };

        this.ws.onclose = (closeEvent) => {
          const {type, wasClean, reason, code} = closeEvent;
          clearInterval(this.ws.keepAliveId);
          // this.ws = null;
          this.emit('close', {reason, code});
        };

        this.ws.onmessage = (e) => {
          if (e.data.length === 0) {
            return this.emit('error', 'Empty data');
          }

          const msg = JSON.parse(e.data);
          if ('error' in msg) {
            return this.emit('error', msg);
          }

          let channelId = msg[0];
          switch (channelId) {
            case ws2SubscriptionToChannelIdMap.heartbeat: {
              this.emit('heartbeat');
              break;
            }

            case ws2SubscriptionToChannelIdMap.ticker: {
              let channelName = 'ticker';
              let rawData = msg[2];
              if (!rawData || !markets.byID[rawData[0]]) {
                return;
              }

              let data = {
                currencyPair: markets.byID[rawData[0]].currencyPair,
                last: rawData[1],
                lowestAsk: rawData[2],
                highestBid: rawData[3],
                percentChange: rawData[4],
                baseVolume: rawData[5],
                quoteVolume: rawData[6],
                isFrozen: rawData[7],
                '24hrHigh': rawData[8],
                '24hrLow': rawData[9],
              };
              this.emit('message', channelName, data);
              break;
            }

            case ws2SubscriptionToChannelIdMap.volume: {
              let channelName = 'volume';
              let rawData = msg[2];
              if (!rawData) {
                return;
              }
              let data = {
                serverTime: rawData[0],
                usersOnline: rawData[1],
                volume: rawData[2],
              };
              this.emit('message', channelName, data);
              break;
            }

            case ws2SubscriptionToChannelIdMap.accountNotifications: {
              let channelName = 'accountNotifications';
              if (msg[1] === 1) {
                this.emit('message', channelName, 'subscriptionSucceeded');
                break;
              }

              let rawDataArray = msg[2];
              let dataArray = [];
              rawDataArray.forEach((rawData) => {
                let rawDataType = rawData[0];
                let data;
                switch (rawDataType) {
                  case 'b': {
                    data = {
                      type: 'balanceUpdate',
                      data: {
                        currency: currencies.byID[rawData[1]].currency,
                        wallet: rawData[2] === 'e' && 'exchange' || rawData[2] === 'm' && 'margin' || rawData[2] === 'l' && 'lending',
                        amount: rawData[3],
                      },
                    };
                    break;
                  }

                  case 'n': {
                    data = {
                      type: 'newLimitOrder',
                      data: {
                        currencyPair: markets.byID[rawData[1]].currencyPair,
                        orderNumber: rawData[2],
                        type: rawData[3] === 0 && 'sell' || 'buy',
                        rate: rawData[4],
                        amount: rawData[5],
                        date: rawData[6],
                      }
                    };
                    break;
                  }

                  case 'o': {
                    data = {
                      type: 'orderUpdate',
                      data: {
                        orderNumber: rawData[1],
                        amount: rawData[2],
                      }
                    };
                    break;
                  }

                  case 't': {
                    data = {
                      type: 'newTrade',
                      data: {
                        tradeID: rawData[1],
                        rate: rawData[2],
                        amount: rawData[3],
                        feeMultiplier: rawData[4],
                        fundingType: rawData[5],
                        orderNumber: rawData[6],
                      }
                    };
                    break;
                  }
                }
                dataArray.push(data);
              });
              this.emit('message', channelName, dataArray);
              break;
            }

            default: {
              if (Number.isInteger(channelId) && 0 < channelId && channelId < 1000) {
                let channelName = markets.byID[channelId].currencyPair;
                if (!this.subscriptions.find(element => element.channelName === channelName)) {
                  this.emit('error', `Received data for unsubscribed channel { channelId: ${channelId}, channelName: ${channelName} }`);
                  return;
                }

                let seq = msg[1];
                let rawDataArray = msg[2];
                let dataArray = [];
                rawDataArray.forEach((rawData) => {
                  let rawDataType = rawData[0];
                  let data;
                  switch (rawDataType) {
                    case 'i': {
                      let marketInfo = rawData[1];
                      if (marketInfo.currencyPair !== channelName) {
                        this.emit('error', `OrderBook currency "${marketInfo.currencyPair}" inconsistent with marketChannel "${channelName}"`);
                        return;
                      }

                      data = {
                        type: 'orderBook',
                        data: {
                          asks: marketInfo.orderBook[0],
                          bids: marketInfo.orderBook[1],
                        },
                      };
                      break;
                    }

                    case 'o': {
                      data = {
                        type: `orderBook${rawData[3] === `0.00000000` && 'Remove' || 'Modify'}`,
                        data: {
                          type: rawData[1] === 1 && 'bid' || 'ask',
                          rate: rawData[2],
                          amount: rawData[3],
                        }
                      };
                      break;
                    }

                    case 't': {
                      data = {
                        type: 'newTrade',
                        data: {
                          tradeID: rawData[1],
                          type: rawData[2] === 1 && 'buy' || 'sell',
                          rate: rawData[3],
                          amount: rawData[4],
                          total: new Big(rawData[3]).times(rawData[4]).toFixed(8),
                          date: new Date(parseInt(rawData[5]) * 1000).toISOString(),
                        }
                      };
                      break;
                    }
                  }
                  dataArray.push(data);
                });
                this.emit('message', channelName, dataArray, seq);
              }
            }
          }
        };

        this.ws.on('unexpected-response', (request, response) => {
          this.emit('error', `unexpected-response (statusCode: ${response.statusCode}, ${response.statusMessage}`);
        });

        this.ws.onerror = (...args) => {
          this.emit('error', ...args)
        };
      })
      .catch((err) => {
        this.emit('error', err.message)
      })
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

    if (this.ws) {
      let channelId = ws2SubscriptionToChannelIdMap[subscription.channelName] || subscription.channelName;
      let params = { command: 'subscribe', channel: channelId };
      if (channelId === 1000) {
        if (!this.key || !this.secret) {
          return this.emit('error', 'API key and secret required');
        }

        params.key = this.key;
        params.payload = `nonce=${this.options && this.options.nonce ? this.options.nonce() : nonce(16)}`;
        params.sign = crypto.createHmac('sha512', this.secret).update(params.payload).digest('hex');
      }

      this.ws.send(JSON.stringify(params));
    }
  }

  unsubscribe(channelName) {
    let subscriptionIndex = this.subscriptions.findIndex(element => element.channelName === channelName);
    if (subscriptionIndex === -1) {
      return;
    }

    if (this.ws) {
      let channelId = ws2SubscriptionToChannelIdMap[this.subscriptions[subscriptionIndex].channelName] || this.subscriptions[subscriptionIndex].channelName;
      let params = { command: 'unsubscribe', channel: channelId };
      this.ws.send(JSON.stringify(params));
    }

    this.subscriptions.splice(subscriptionIndex, 1);
  }

  closeWebSocket() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

module.exports = Poloniex;
