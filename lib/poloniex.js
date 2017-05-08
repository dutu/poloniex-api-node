
module.exports = (function() {
    'use strict';

    const debug = require('debug')('poloniex');
    const crypto  = require('crypto');
    const request = require('request');
    const nonce = require('nonce')();


    const version = require('../package.json').version;
    const PUBLIC_API_URL = 'https://poloniex.com/public';
    const PRIVATE_API_URL = 'https://poloniex.com/tradingApi';
    const USER_AGENT = `${require('../package.json').name} ${version}`;

    function Poloniex(key, secret){
        // Generate headers signed by this user's key and secret.
        // The secret is encapsulated and never exposed
        this._getPrivateHeaders = function(parameters){
            if (!key || !secret){
                return null;
            }

            let paramString = Object.keys(parameters).map(function(param){
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

            debug(`${options.url}, ${options.method}, ${JSON.stringify(options.method === 'GET' && options.qs || options.form)}`);
            request(options, function(error, response, body) {
                let err = error;
                if (!err && typeof response.body === 'undefined'){
                    err = new Error('Poloniex error: Undefined response');
                }
                if (!err && response.statusCode !== 200) {
                    err =  new Error(`Poloniex error ${response.statusCode}: ${response.body.error || response.body}`);
                }
                if (!err && typeof body === 'undefined' || body === null){
                    err = new Error('Poloniex error: Empty response');
                }
                if (!err && body.error) {
                    err = new Error(body.error);
                }
                if (!err) debug(`req: ${response.request.href}, resp: ${response.body.error}`);
                callback(err, body);
            });
            return this;
        },

        // Make a public API request
        _public: function(command, parameters, callback){
            let param = parameters;
            param.command = command;
            let options = {
                method: 'GET',
                url: PUBLIC_API_URL,
                qs: param,
            };
            return this._request(options, callback);
        },

        // Make a private API request
        _private: function(command, parameters, callback){
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
                return this._request(options, callback);
            } else {
                let err = new Error('Error: API key and secret required');
                return callback(err, null);
            }
        },

        // Public API Methods

        returnTicker: function(callback){
            let parameters = {};
            return this._public('returnTicker', parameters, callback);
        },

        return24Volume: function(callback){
            let parameters = {};
            return this._public('return24hVolume', parameters, callback);
        },

        returnOrderBook: function(currencyPair, depth, callback){
            let parameters = {
                currencyPair,
            };
            if (depth) parameters.depth = depth;
            return this._public('returnOrderBook', parameters, callback);
        },

        returnTradeHistory: function(currencyPair, start, end, callback){
            let parameters = {
                currencyPair,
            };
            if (start) parameters.start = start;
            if (end) parameters.end = end;
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
            let parameters = {
                currency,
            };
            if (limit) parameters.limit = limit;
            return this._public('returnLoanOrders', parameters, callback);
        },

        // Trading API Methods

        returnBalances: function(callback){
            let parameters = {};
            return this._private('returnBalances', parameters, callback);
        },

        returnCompleteBalances: function(account, callback){
            let parameters = {};
            if (account) parameters.account =account;
            return this._private('returnCompleteBalances', parameters, callback);
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
            let parameters = {
                currencyPair,
            };
            if (start) parameters.start = start;
            if (end) parameters.end = end;
            return this._private('returnTradeHistory', parameters, callback);
        },

        returnOrderTrades: function(orderNumber, callback){
            let parameters = {
                orderNumber,
            };
            return this._private('returnOrderTrades', parameters, callback);
        },

        buy: function(currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly, callback){
            let parameters = {
                currencyPair,
                rate,
                amount,
            };
            if (fillOrKill) parameters.fillOrKill = fillOrKill;
            if (immediateOrCancel) parameters.immediateOrCancel = immediateOrCancel;
            if (postOnly) parameters.postOnly = postOnly;
            return this._private('buy', parameters, callback);
        },

        sell: function(currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly, callback){
            let parameters = {
                currencyPair,
                rate,
                amount,
            };
            if (fillOrKill) parameters.fillOrKill = fillOrKill;
            if (immediateOrCancel) parameters.immediateOrCancel = immediateOrCancel;
            if (postOnly) parameters.postOnly = postOnly;
            return this._private('sell', parameters, callback);
        },

        cancelOrder: function(orderNumber, callback){
            let parameters = {
                orderNumber,
            };
            return this._private('cancelOrder', parameters, callback);
        },

        moveOrder: function(orderNumber, rate, amount, immediateOrCancel, postOnly, callback){
            let parameters = {
                orderNumber,
                rate,
            };
            if (amount) parameters.amount = amount;
            if (postOnly) parameters.postOnly = postOnly;
            if (immediateOrCancel) parameters.immediateOrCancel = immediateOrCancel;
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
            let parameters = {};
            if (account) parameters.account = account;
            return this._private('returnAvailableAccountBalances', parameters, callback);
        },

        returnTradableBalances: function(callback){
            let parameters = {};
            return this._private('returnTradableBalances', parameters, callback);
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
            let parameters = {};
            return this._private('returnMarginAccountSummary', parameters, callback);
        },

        marginBuy: function(currencyPair, rate, amount, lendingRate, callback){
            let parameters = {
                currencyPair,
                rate,
                amount,
            };
            if (lendingRate) parameters.lendingRate = lendingRate;
            return this._private('marginBuy', parameters, callback);
        },

        marginSell: function(currencyPair, rate, amount, lendingRate, callback){
            let parameters = {
                currencyPair,
                rate,
                amount,
            };
            if (lendingRate) parameters.lendingRate = lendingRate;
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
            let parameters = {};
            return this._private('returnOpenLoanOffers', parameters, callback);
        },

        returnActiveLoans: function(callback){
            let parameters = {};
            return this._private('returnActiveLoans', parameters, callback);
        },

        returnLendingHistory: function(start, end, limit, callback){
            let parameters = {
                start,
                end,
            };
            if (limit) parameters.limit = limit;
            return this._private('returnLendingHistory', parameters, callback);
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
