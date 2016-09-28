
module.exports = (function() {
    'use strict';

    const debug = require("debug")("poloniex");
    const request = require('request');
    const nonce = require('nonce')();


    const version         = '1.0.0';
    const PUBLIC_API_URL  = 'https://poloniex.com/public';
    const PRIVATE_API_URL = 'https://poloniex.com/tradingApi';
    const USER_AGENT      = `poloniex-node-api ${version}`;

    // Helper methods
    function sortParameters(a, b){
        return 0;
        // Sort `nonce` parameter last, and the rest alphabetically
        return a === 'nonce' || a > b ? 1 : -1;
    }

    function Poloniex(key, secret){
        // Generate headers signed by this user's key and secret.
        // The secret is encapsulated and never exposed
        this._getPrivateHeaders = function(parameters){
            if (!key || !secret){
                throw 'Poloniex: Error. API key and secret required';
            }

            // Sort parameters alphabetically and convert to `arg1=foo&arg2=bar`
            let paramString = Object.keys(parameters).sort(sortParameters).map(function(param){
                return encodeURIComponent(param) + '=' + encodeURIComponent(parameters[param]);
            }).join('&');

            let signature = crypto.createHmac('sha512', secret).update(paramString).digest('hex');
            return {
                Key: key,
                Sign: signature
            };
        };
    }

    // Currently, this fails with `Error: CERT_UNTRUSTED`
    // Poloniex.STRICT_SSL can be set to `false` to avoid this. Use with caution.
    // Will be removed in future, once this is resolved.
    Poloniex.STRICT_SSL = true;

    // Customisable user agent string
    Poloniex.USER_AGENT = USER_AGENT;

    // Prototype
    Poloniex.prototype = {
        constructor: Poloniex,

        // Make an API request
        _request: function(options, callback){
            if (!('headers' in options)){
                options.headers = {};
            }

            options.json = true;
            options.headers['User-Agent'] = Poloniex.USER_AGENT;
            options.strictSSL = Poloniex.STRICT_SSL;
            options.timeout = 3000;

            debug(`${options.url}, ${options.method}, ${JSON.stringify(options.method === "GET" && options.qs || options.form)}`);
            request(options, function(err, response, body) {
                if (!err && response.statusCode !== 200) {
                    err =  new Error("Poloniex error " + response.statusCode + ": " + response.statusMessage);
                }
                if (!err && typeof body === 'undefined' || body === null){
                    // Empty response
                    err = new Error("Poloniex error: Empty response");
                }
                if (!err && body.error) {
                    err = new Error(body.error);
                }
                if (!err) debug(`req: ${response.request.href}, resp: ${response.statusMessage}`);
                callback(err, body);
            });

            return this;
        },

        // Make a public API request
        _public: function(command, parameters, callback){
            if (typeof parameters === 'function'){
                callback = parameters;
                parameters = {};
            }

            parameters || (parameters = {});
            parameters.command = command;
            let options = {
                method: 'GET',
                url: PUBLIC_API_URL,
                qs: parameters,
            };

            options.qs.command = command;
            return this._request(options, callback);
        },

        // Make a private API request
        _private: function(command, parameters, callback){
            if (typeof parameters === 'function'){
                callback = parameters;
                parameters = {};
            }

            parameters || (parameters = {});
            parameters.command = command;
            parameters.nonce = nonce(16);
            let options = {
                method: 'POST',
                url: PRIVATE_API_URL,
                form: parameters,
                headers: this._getPrivateHeaders(parameters),
            };

            return this._request(options, callback);
        },


        // PUBLIC METHODS

        returnTicker: function(callback){
            return this._public('returnTicker', callback);
        },

        return24Volume: function(callback){
            return this._public('return24hVolume', callback);
        },

        returnOrderBook: function(currencyPair, depth, callback){
            let parameters;
            if (typeof depth === 'function'){
                callback = depth;
                parameters = {
                    currencyPair,
                };
            } else {
                parameters = {
                    currencyPair,
                    depth,
                };
            }
            return this._public('returnOrderBook', parameters, callback);
        },

        returnTradeHistory: function(currencyPair, start, end, callback){
            if (typeof start === 'function') {
                let parameters = {
                    currencyPair,
                };
                let callback  = start;
                return this._private('returnTradeHistory', parameters, callback);
            }
            if (typeof end === 'function') {
                let parameters = {
                    currencyPair,
                    start,
                };
                let callback = end;
                return this._private('returnTradeHistory', parameters, callback);
            }
            let parameters = {
                currencyPair,
                start,
                end,
            };
            return this._public('returnTradeHistory', parameters, callback);
        },

        returnChartData: function(currencyPair, period, start, end, callback){
            let parameters = {
                currencyPair,
                period,
                start,
                end,
            };
            return this._public('returnChartData', parameters, callback);
        },

        returnCurrencies: function(callback){
            let parameters = {};
            return this._public('returnCurrencies', parameters, callback);
        },

        returnLoanOrders: function(currency, limit, callback){
            let parameters;
            if (typeof limit === 'function'){
                callback = limit;
                parameters = {
                    currency,
                };
            } else {
                parameters = {
                    currency,
                    limit,
                };
            }
            return this._public('returnLoanOrders', parameters, callback);
        },


        // PRIVATE METHODS

        returnBalances: function(callback){
            return this._private('returnBalances', callback);
        },

        returnCompleteBalances: function(account, callback){
            let parameters;
            if (typeof account === 'function'){
                callback = account;
                return this._private('returnCompleteBalances', callback);
            } else {
                parameters = {
                    account,
                };
                return this._private('returnCompleteBalances', parameters, callback);
            }
        },

        returnDepositAddresses: function(callback){
            let parameters = {};
            return this._private('returnDepositAddresses', parameters, callback);
        },

        generateNewAddress: function(currency, callback){
            let parameters = {
                currency,
            };
            return this._private('generateNewAddress', parameters, callback);
        },

        returnDepositsWithdrawals: function(start, end, callback){
            let parameters = {
                start,
                end,
            };
            return this._private('returnDepositsWithdrawals', parameters, callback);
        },

        returnOpenOrders: function(currencyPair, callback){
            let parameters = {
                currencyPair,
            };
            return this._private('returnOpenOrders', parameters, callback);
        },

        returnMyTradeHistory: function(currencyPair, start, end, callback){
            if (typeof start === 'function') {
                let parameters = {
                    currencyPair,
                };
                let callback  = start;
                return this._private('returnTradeHistory', parameters, callback);
            }
            if (typeof end === 'function') {
                let parameters = {
                    currencyPair,
                    start,
                };
                let callback = end;
                return this._private('returnTradeHistory', parameters, callback);
            }
            let parameters = {
                currencyPair,
                start,
                end,
            };
            return this._private('returnTradeHistory', parameters, callback);
        },

        returnOrderTrades: function(orderNumber, callback){
            let parameters = {
                orderNumber,
            };
            return this._private('returnOrderTrades', parameters, callback);
        },

        buy: function(currencyPair, rate, amount, callback){
            let parameters = {
                currencyPair,
                rate,
                amount,
            };
            return this._private('buy', parameters, callback);
        },

        sell: function(currencyPair, rate, amount, callback){
            let parameters = {
                currencyPair,
                rate,
                amount,
            };
            return this._private('sell', parameters, callback);
        },

        cancelOrder: function(orderNumber, callback){
            let parameters = {
                orderNumber,
            };
            return this._private('cancelOrder', parameters, callback);
        },

        moveOrder: function(orderNumber, rate, amount, callback){
            let parameters = {
                orderNumber,
                rate,
            };

            if (typeof amount === 'function'){
                callback = amount;
            } else {
                parameters.amount = amount;
            }
            return this._private('moveOrder', parameters, callback);
        },

        withdraw: function(currency, amount, address, callback){
            let parameters = {
                currency,
                amount,
                address,
            };
            return this._private('withdraw', parameters, callback);
        },

        returnFeeInfo: function(callback){
            let parameters = {};
            return this._private('returnFeeInfo', parameters, callback);
        },

        returnAvailableAccountBalances: function(account, callback){
            let parameters;
            if (typeof account === 'function'){
                callback = account;
                return this._private('returnAvailableAccountBalances', callback);
            } else {
                parameters = {
                    account,
                };
                return this._private('returnAvailableAccountBalances', parameters, callback);
            }
        },

        returnTradableBalances: function(callback){
            return this._private('returnTradableBalances', callback);
        },

        transferBalance: function(currency, amount, fromAccount, toAccount, callback){
            let parameters = {
                currency,
                amount,
                fromAccount,
                toAccount,
            };
            return this._private('transferBalance', parameters, callback);
        },

        returnMarginAccountSummary: function(callback){
            return this._private('returnMarginAccountSummary', callback);
        },

        marginBuy: function(currencyPair, rate, amount, lendingRate, callback){
            let parameters = {
                currencyPair,
                rate,
                amount,
            };
            if (typeof lendingRate === 'function'){
                callback = lendingRate;
            } else {
                parameters.lendingRate = lendingRate;
            }
            return this._private('marginBuy', parameters, callback);
        },

        marginSell: function(currencyPair, rate, amount, lendingRate, callback){
            let parameters = {
                currencyPair,
                rate,
                amount,
            };
            if (typeof lendingRate === 'function'){
                callback = lendingRate;
            } else {
                parameters.lendingRate = lendingRate;
            }
            return this._private('marginSell', parameters, callback);
        },

        getMarginPosition: function(currencyPair, callback){
            let parameters = {
                currencyPair,
            };
            return this._private('getMarginPosition', parameters, callback);
        },

        closeMarginPosition: function(currencyPair, callback){
            let parameters = {
                currencyPair,
            };
            return this._private('closeMarginPosition', parameters, callback);
        },

        createLoanOffer: function(currency, amount, duration, autoRenew, lendingRate, callback){
            let parameters = {
                currency,
                amount,
                duration,
                autoRenew,
                lendingRate,
            };
            return this._private('createLoanOffer', parameters, callback);
        },

        cancelLoanOffer: function(orderNumber, callback){
            let parameters = {
                orderNumber,
            };
            return this._private('cancelLoanOffer', parameters, callback);
        },

        returnOpenLoanOffers: function(callback){
            return this._private('returnOpenLoanOffers', callback);
        },

        returnActiveLoans: function(callback){
            return this._private('returnActiveLoans', callback);
        },

        toggleAutoRenew: function(orderNumber, callback){
            let parameters = {
                orderNumber,
            };

            return this._private('toggleAutoRenew', parameters, callback);
        },
    };
    return Poloniex;
})();
