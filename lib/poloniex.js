'use strict';

module.exports = function () {
    'use strict';

    var debug = require('debug')('poloniex');
    var crypto = require('crypto');
    var request = require('request');
    var nonce = require('nonce')();

    var version = require('../package.json').version;
    var PUBLIC_API_URL = 'https://poloniex.com/public';
    var PRIVATE_API_URL = 'https://poloniex.com/tradingApi';
    var USER_AGENT = require('../package.json').name + ' ' + version;

    function Poloniex(key, secret) {
        // Generate headers signed by this user's key and secret.
        // The secret is encapsulated and never exposed
        this._getPrivateHeaders = function (parameters) {
            if (!key || !secret) {
                return null;
            }

            var paramString = Object.keys(parameters).map(function (param) {
                return encodeURIComponent(param) + '=' + encodeURIComponent(parameters[param]);
            }).join('&');

            var signature = crypto.createHmac('sha512', secret).update(paramString).digest('hex');
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
        _request: function _request(options, callback) {
            if (!('headers' in options)) {
                options.headers = {};
            }

            options.json = true;
            options.headers['User-Agent'] = Poloniex.USER_AGENT;
            options.strictSSL = Poloniex.STRICT_SSL;
            options.timeout = 3000;

            debug(options.url + ', ' + options.method + ', ' + JSON.stringify(options.method === 'GET' && options.qs || options.form));
            request(options, function (error, response, body) {
                var err = error;
                if (!err && response.statusCode !== 200) {
                    err = new Error('Poloniex error ' + response.statusCode + ': ' + (response.body.error || response.body));
                }
                if (!err && typeof body === 'undefined' || body === null) {
                    err = new Error('Poloniex error: Empty response');
                }
                if (!err && body.error) {
                    err = new Error(body.error);
                }
                if (!err) debug('req: ' + response.request.href + ', resp: ' + response.body.error);
                callback(err, body);
            });
            return this;
        },

        // Make a public API request
        _public: function _public(command, parameters, callback) {
            var param = parameters;
            param.command = command;
            var options = {
                method: 'GET',
                url: PUBLIC_API_URL,
                qs: param
            };
            return this._request(options, callback);
        },

        // Make a private API request
        _private: function _private(command, parameters, callback) {
            var param = parameters;
            param.command = command;
            param.nonce = nonce(16);
            var options = {
                method: 'POST',
                url: PRIVATE_API_URL,
                form: param,
                headers: this._getPrivateHeaders(param)
            };
            if (options.headers) {
                return this._request(options, callback);
            } else {
                var err = new Error('Error: API key and secret required');
                return callback(err, null);
            }
        },

        // Public API Methods

        returnTicker: function returnTicker(callback) {
            var parameters = {};
            return this._public('returnTicker', parameters, callback);
        },

        return24Volume: function return24Volume(callback) {
            var parameters = {};
            return this._public('return24hVolume', parameters, callback);
        },

        returnOrderBook: function returnOrderBook(currencyPair, depth, callback) {
            var parameters = {
                currencyPair: currencyPair
            };
            if (depth) parameters.depth = depth;
            return this._public('returnOrderBook', parameters, callback);
        },

        returnTradeHistory: function returnTradeHistory(currencyPair, start, end, callback) {
            var parameters = {
                currencyPair: currencyPair
            };
            if (start) parameters.start = start;
            if (end) parameters.end = end;
            return this._public('returnTradeHistory', parameters, callback);
        },

        returnChartData: function returnChartData(currencyPair, period, start, end, callback) {
            var parameters = {
                currencyPair: currencyPair,
                period: period,
                start: start,
                end: end
            };
            return this._public('returnChartData', parameters, callback);
        },

        returnCurrencies: function returnCurrencies(callback) {
            var parameters = {};
            return this._public('returnCurrencies', parameters, callback);
        },

        returnLoanOrders: function returnLoanOrders(currency, limit, callback) {
            var parameters = {
                currency: currency
            };
            if (limit) parameters.limit = limit;
            return this._public('returnLoanOrders', parameters, callback);
        },

        // Trading API Methods

        returnBalances: function returnBalances(callback) {
            var parameters = {};
            return this._private('returnBalances', parameters, callback);
        },

        returnCompleteBalances: function returnCompleteBalances(account, callback) {
            var parameters = {};
            if (account) parameters.account = account;
            return this._private('returnCompleteBalances', parameters, callback);
        },

        returnDepositAddresses: function returnDepositAddresses(callback) {
            var parameters = {};
            return this._private('returnDepositAddresses', parameters, callback);
        },

        generateNewAddress: function generateNewAddress(currency, callback) {
            var parameters = {
                currency: currency
            };
            return this._private('generateNewAddress', parameters, callback);
        },

        returnDepositsWithdrawals: function returnDepositsWithdrawals(start, end, callback) {
            var parameters = {
                start: start,
                end: end
            };
            return this._private('returnDepositsWithdrawals', parameters, callback);
        },

        returnOpenOrders: function returnOpenOrders(currencyPair, callback) {
            var parameters = {
                currencyPair: currencyPair
            };
            return this._private('returnOpenOrders', parameters, callback);
        },

        returnMyTradeHistory: function returnMyTradeHistory(currencyPair, start, end, callback) {
            var parameters = {
                currencyPair: currencyPair
            };
            if (start) parameters.start = start;
            if (end) parameters.end = end;
            return this._private('returnTradeHistory', parameters, callback);
        },

        returnOrderTrades: function returnOrderTrades(orderNumber, callback) {
            var parameters = {
                orderNumber: orderNumber
            };
            return this._private('returnOrderTrades', parameters, callback);
        },

        buy: function buy(currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly, callback) {
            var parameters = {
                currencyPair: currencyPair,
                rate: rate,
                amount: amount
            };
            if (fillOrKill) parameters.fillOrKill = fillOrKill;
            if (immediateOrCancel) parameters.immediateOrCancel = immediateOrCancel;
            if (postOnly) parameters.postOnly = postOnly;
            return this._private('buy', parameters, callback);
        },

        sell: function sell(currencyPair, rate, amount, fillOrKill, immediateOrCancel, postOnly, callback) {
            var parameters = {
                currencyPair: currencyPair,
                rate: rate,
                amount: amount
            };
            if (fillOrKill) parameters.fillOrKill = fillOrKill;
            if (immediateOrCancel) parameters.immediateOrCancel = immediateOrCancel;
            if (postOnly) parameters.postOnly = postOnly;
            return this._private('sell', parameters, callback);
        },

        cancelOrder: function cancelOrder(orderNumber, callback) {
            var parameters = {
                orderNumber: orderNumber
            };
            return this._private('cancelOrder', parameters, callback);
        },

        moveOrder: function moveOrder(orderNumber, rate, amount, immediateOrCancel, postOnly, callback) {
            var parameters = {
                orderNumber: orderNumber,
                rate: rate
            };
            if (amount) parameters.amount = amount;
            if (postOnly) parameters.postOnly = postOnly;
            if (immediateOrCancel) parameters.immediateOrCancel = immediateOrCancel;
            return this._private('moveOrder', parameters, callback);
        },

        withdraw: function withdraw(currency, amount, address, callback) {
            var parameters = {
                currency: currency,
                amount: amount,
                address: address
            };
            return this._private('withdraw', parameters, callback);
        },

        returnFeeInfo: function returnFeeInfo(callback) {
            var parameters = {};
            return this._private('returnFeeInfo', parameters, callback);
        },

        returnAvailableAccountBalances: function returnAvailableAccountBalances(account, callback) {
            var parameters = {};
            if (account) parameters.account = account;
            return this._private('returnAvailableAccountBalances', parameters, callback);
        },

        returnTradableBalances: function returnTradableBalances(callback) {
            var parameters = {};
            return this._private('returnTradableBalances', parameters, callback);
        },

        transferBalance: function transferBalance(currency, amount, fromAccount, toAccount, callback) {
            var parameters = {
                currency: currency,
                amount: amount,
                fromAccount: fromAccount,
                toAccount: toAccount
            };
            return this._private('transferBalance', parameters, callback);
        },

        returnMarginAccountSummary: function returnMarginAccountSummary(callback) {
            var parameters = {};
            return this._private('returnMarginAccountSummary', parameters, callback);
        },

        marginBuy: function marginBuy(currencyPair, rate, amount, lendingRate, callback) {
            var parameters = {
                currencyPair: currencyPair,
                rate: rate,
                amount: amount
            };
            if (lendingRate) parameters.lendingRate = lendingRate;
            return this._private('marginBuy', parameters, callback);
        },

        marginSell: function marginSell(currencyPair, rate, amount, lendingRate, callback) {
            var parameters = {
                currencyPair: currencyPair,
                rate: rate,
                amount: amount
            };
            if (lendingRate) parameters.lendingRate = lendingRate;
            return this._private('marginSell', parameters, callback);
        },

        getMarginPosition: function getMarginPosition(currencyPair, callback) {
            var parameters = {
                currencyPair: currencyPair
            };
            return this._private('getMarginPosition', parameters, callback);
        },

        closeMarginPosition: function closeMarginPosition(currencyPair, callback) {
            var parameters = {
                currencyPair: currencyPair
            };
            return this._private('closeMarginPosition', parameters, callback);
        },

        createLoanOffer: function createLoanOffer(currency, amount, duration, autoRenew, lendingRate, callback) {
            var parameters = {
                currency: currency,
                amount: amount,
                duration: duration,
                autoRenew: autoRenew,
                lendingRate: lendingRate
            };
            return this._private('createLoanOffer', parameters, callback);
        },

        cancelLoanOffer: function cancelLoanOffer(orderNumber, callback) {
            var parameters = {
                orderNumber: orderNumber
            };
            return this._private('cancelLoanOffer', parameters, callback);
        },

        returnOpenLoanOffers: function returnOpenLoanOffers(callback) {
            var parameters = {};
            return this._private('returnOpenLoanOffers', parameters, callback);
        },

        returnActiveLoans: function returnActiveLoans(callback) {
            var parameters = {};
            return this._private('returnActiveLoans', parameters, callback);
        },

        returnLendingHistory: function returnLendingHistory(start, end, limit, callback) {
            var parameters = {
                start: start,
                end: end
            };
            if (limit) parameters.limit = limit;
            return this._private('returnLendingHistory', parameters, callback);
        },

        toggleAutoRenew: function toggleAutoRenew(orderNumber, callback) {
            var parameters = {
                orderNumber: orderNumber
            };
            return this._private('toggleAutoRenew', parameters, callback);
        }
    };
    return Poloniex;
}();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9wb2xvbmlleC5qcyJdLCJuYW1lcyI6WyJtb2R1bGUiLCJleHBvcnRzIiwiZGVidWciLCJyZXF1aXJlIiwiY3J5cHRvIiwicmVxdWVzdCIsIm5vbmNlIiwidmVyc2lvbiIsIlBVQkxJQ19BUElfVVJMIiwiUFJJVkFURV9BUElfVVJMIiwiVVNFUl9BR0VOVCIsIm5hbWUiLCJQb2xvbmlleCIsImtleSIsInNlY3JldCIsIl9nZXRQcml2YXRlSGVhZGVycyIsInBhcmFtZXRlcnMiLCJwYXJhbVN0cmluZyIsIk9iamVjdCIsImtleXMiLCJtYXAiLCJwYXJhbSIsImVuY29kZVVSSUNvbXBvbmVudCIsImpvaW4iLCJzaWduYXR1cmUiLCJjcmVhdGVIbWFjIiwidXBkYXRlIiwiZGlnZXN0IiwiS2V5IiwiU2lnbiIsIlNUUklDVF9TU0wiLCJwcm90b3R5cGUiLCJjb25zdHJ1Y3RvciIsIl9yZXF1ZXN0Iiwib3B0aW9ucyIsImNhbGxiYWNrIiwiaGVhZGVycyIsImpzb24iLCJzdHJpY3RTU0wiLCJ0aW1lb3V0IiwidXJsIiwibWV0aG9kIiwiSlNPTiIsInN0cmluZ2lmeSIsInFzIiwiZm9ybSIsImVycm9yIiwicmVzcG9uc2UiLCJib2R5IiwiZXJyIiwic3RhdHVzQ29kZSIsIkVycm9yIiwiaHJlZiIsIl9wdWJsaWMiLCJjb21tYW5kIiwiX3ByaXZhdGUiLCJyZXR1cm5UaWNrZXIiLCJyZXR1cm4yNFZvbHVtZSIsInJldHVybk9yZGVyQm9vayIsImN1cnJlbmN5UGFpciIsImRlcHRoIiwicmV0dXJuVHJhZGVIaXN0b3J5Iiwic3RhcnQiLCJlbmQiLCJyZXR1cm5DaGFydERhdGEiLCJwZXJpb2QiLCJyZXR1cm5DdXJyZW5jaWVzIiwicmV0dXJuTG9hbk9yZGVycyIsImN1cnJlbmN5IiwibGltaXQiLCJyZXR1cm5CYWxhbmNlcyIsInJldHVybkNvbXBsZXRlQmFsYW5jZXMiLCJhY2NvdW50IiwicmV0dXJuRGVwb3NpdEFkZHJlc3NlcyIsImdlbmVyYXRlTmV3QWRkcmVzcyIsInJldHVybkRlcG9zaXRzV2l0aGRyYXdhbHMiLCJyZXR1cm5PcGVuT3JkZXJzIiwicmV0dXJuTXlUcmFkZUhpc3RvcnkiLCJyZXR1cm5PcmRlclRyYWRlcyIsIm9yZGVyTnVtYmVyIiwiYnV5IiwicmF0ZSIsImFtb3VudCIsImZpbGxPcktpbGwiLCJpbW1lZGlhdGVPckNhbmNlbCIsInBvc3RPbmx5Iiwic2VsbCIsImNhbmNlbE9yZGVyIiwibW92ZU9yZGVyIiwid2l0aGRyYXciLCJhZGRyZXNzIiwicmV0dXJuRmVlSW5mbyIsInJldHVybkF2YWlsYWJsZUFjY291bnRCYWxhbmNlcyIsInJldHVyblRyYWRhYmxlQmFsYW5jZXMiLCJ0cmFuc2ZlckJhbGFuY2UiLCJmcm9tQWNjb3VudCIsInRvQWNjb3VudCIsInJldHVybk1hcmdpbkFjY291bnRTdW1tYXJ5IiwibWFyZ2luQnV5IiwibGVuZGluZ1JhdGUiLCJtYXJnaW5TZWxsIiwiZ2V0TWFyZ2luUG9zaXRpb24iLCJjbG9zZU1hcmdpblBvc2l0aW9uIiwiY3JlYXRlTG9hbk9mZmVyIiwiZHVyYXRpb24iLCJhdXRvUmVuZXciLCJjYW5jZWxMb2FuT2ZmZXIiLCJyZXR1cm5PcGVuTG9hbk9mZmVycyIsInJldHVybkFjdGl2ZUxvYW5zIiwicmV0dXJuTGVuZGluZ0hpc3RvcnkiLCJ0b2dnbGVBdXRvUmVuZXciXSwibWFwcGluZ3MiOiI7O0FBQ0FBLE9BQU9DLE9BQVAsR0FBa0IsWUFBVztBQUN6Qjs7QUFFQSxRQUFNQyxRQUFRQyxRQUFRLE9BQVIsRUFBaUIsVUFBakIsQ0FBZDtBQUNBLFFBQU1DLFNBQVVELFFBQVEsUUFBUixDQUFoQjtBQUNBLFFBQU1FLFVBQVVGLFFBQVEsU0FBUixDQUFoQjtBQUNBLFFBQU1HLFFBQVFILFFBQVEsT0FBUixHQUFkOztBQUdBLFFBQU1JLFVBQVVKLFFBQVEsaUJBQVIsRUFBMkJJLE9BQTNDO0FBQ0EsUUFBTUMsaUJBQWlCLDZCQUF2QjtBQUNBLFFBQU1DLGtCQUFrQixpQ0FBeEI7QUFDQSxRQUFNQyxh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c0NvbnRlbnQiOlsiXHJcbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uKCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIGNvbnN0IGRlYnVnID0gcmVxdWlyZSgnZGVidWcnKSgncG9sb25pZXgnKTtcclxuICAgIGNvbnN0IGNyeXB0byAgPSByZXF1aXJlKCdjcnlwdG8nKTtcclxuICAgIGNvbnN0IHJlcXVlc3QgPSByZXF1aXJlKCdyZXF1ZXN0Jyk7XHJcbiAgICBjb25zdCBub25jZSA9IHJlcXVpcmUoJ25vbmNlJykoKTtcclxuXHJcblxyXG4gICAgY29uc3QgdmVyc2lvbiA9IHJlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpLnZlcnNpb247XHJcbiAgICBjb25zdCBQVUJMSUNfQVBJX1VSTCA9ICdodHRwczovL3BvbG9uaWV4LmNvbS9wdWJsaWMnO1xyXG4gICAgY29uc3QgUFJJVkFURV9BUElfVVJMID0gJ2h0dHBzOi8vcG9sb25pZXguY29tL3RyYWRpbmdBcGknO1xyXG4gICAgY29uc3QgVVNFUl9BR0VOVCA9IGAke3JlcXVpcmUoJy4uL3BhY2thZ2UuanNvbicpLm5hbWV9ICR7dmVyc2lvbn1gO1xyXG5cclxuICAgIGZ1bmN0aW9uIFBvbG9uaWV4KGtleSwgc2VjcmV0KXtcclxuICAgICAgICAvLyBHZW5lcmF0ZSBoZWFkZXJzIHNpZ25lZCBieSB0aGlzIHVzZXIncyBrZXkgYW5kIHNlY3JldC5cclxuICAgICAgICAvLyBUaGUgc2VjcmV0IGlzIGVuY2Fwc3VsYXRlZCBhbmQgbmV2ZXIgZXhwb3NlZFxyXG4gICAgICAgIHRoaXMuX2dldFByaXZhdGVIZWFkZXJzID0gZnVuY3Rpb24ocGFyYW1ldGVycyl7XHJcbiAgICAgICAgICAgIGlmICgha2V5IHx8ICFzZWNyZXQpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBwYXJhbVN0cmluZyA9IE9iamVjdC5rZXlzKHBhcmFtZXRlcnMpLm1hcChmdW5jdGlvbihwYXJhbSl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtKSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChwYXJhbWV0ZXJzW3BhcmFtXSk7XHJcbiAgICAgICAgICAgIH0pLmpvaW4oJyYnKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBzaWduYXR1cmUgPSBjcnlwdG8uY3JlYXRlSG1hYygnc2hhNTEyJywgc2VjcmV0KS51cGRhdGUocGFyYW1TdHJpbmcpLmRpZ2VzdCgnaGV4Jyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBLZXk6IGtleSxcclxuICAgICAgICAgICAgICAgIFNpZ246IHNpZ25hdHVyZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3VycmVudGx5LCB0aGlzIGZhaWxzIHdpdGggYEVycm9yOiBDRVJUX1VOVFJVU1RFRGBcclxuICAgIC8vIFBvbG9uaWV4LlNUUklDVF9TU0wgY2FuIGJlIHNldCB0byBgZmFsc2VgIHRvIGF2b2lkIHRoaXMuIFVzZSB3aXRoIGNhdXRpb24uXHJcbiAgICAvLyBXaWxsIGJlIHJlbW92ZWQgaW4gZnV0dXJlLCBvbmNlIHRoaXMgaXMgcmVzb2x2ZWQuXHJcbiAgICBQb2xvbmlleC5TVFJJQ1RfU1NMID0gdHJ1ZTtcclxuXHJcbiAgICAvLyBDdXN0b21pc2FibGUgdXNlciBhZ2VudCBzdHJpbmdcclxuICAgIFBvbG9uaWV4LlVTRVJfQUdFTlQgPSBVU0VSX0FHRU5UO1xyXG5cclxuICAgIC8vIFByb3RvdHlwZVxyXG4gICAgUG9sb25pZXgucHJvdG90eXBlID0ge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yOiBQb2xvbmlleCxcclxuXHJcbiAgICAgICAgLy8gTWFrZSBhbiBBUEkgcmVxdWVzdFxyXG4gICAgICAgIF9yZXF1ZXN0OiBmdW5jdGlvbihvcHRpb25zLCBjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGlmICghKCdoZWFkZXJzJyBpbiBvcHRpb25zKSl7XHJcbiAgICAgICAgICAgICAgICBvcHRpb25zLmhlYWRlcnMgPSB7fTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgb3B0aW9ucy5qc29uID0gdHJ1ZTtcclxuICAgICAgICAgICAgb3B0aW9ucy5oZWFkZXJzWydVc2VyLUFnZW50J10gPSBQb2xvbmlleC5VU0VSX0FHRU5UO1xyXG4gICAgICAgICAgICBvcHRpb25zLnN0cmljdFNTTCA9IFBvbG9uaWV4LlNUUklDVF9TU0w7XHJcbiAgICAgICAgICAgIG9wdGlvbnMudGltZW91dCA9IDMwMDA7XHJcblxyXG4gICAgICAgICAgICBkZWJ1ZyhgJHtvcHRpb25zLnVybH0sICR7b3B0aW9ucy5tZXRob2R9LCAke0pTT04uc3RyaW5naWZ5KG9wdGlvbnMubWV0aG9kID09PSAnR0VUJyAmJiBvcHRpb25zLnFzIHx8IG9wdGlvbnMuZm9ybSl9YCk7XHJcbiAgICAgICAgICAgIHJlcXVlc3Qob3B0aW9ucywgZnVuY3Rpb24oZXJyb3IsIHJlc3BvbnNlLCBib2R5KSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZXJyID0gZXJyb3I7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWVyciAmJiByZXNwb25zZS5zdGF0dXNDb2RlICE9PSAyMDApIHtcclxuICAgICAgICAgICAgICAgICAgICBlcnIgPSAgbmV3IEVycm9yKGBQb2xvbmlleCBlcnJvciAke3Jlc3BvbnNlLnN0YXR1c0NvZGV9OiAke3Jlc3BvbnNlLmJvZHkuZXJyb3IgfHwgcmVzcG9uc2UuYm9keX1gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICghZXJyICYmIHR5cGVvZiBib2R5ID09PSAndW5kZWZpbmVkJyB8fCBib2R5ID09PSBudWxsKXtcclxuICAgICAgICAgICAgICAgICAgICBlcnIgPSBuZXcgRXJyb3IoJ1BvbG9uaWV4IGVycm9yOiBFbXB0eSByZXNwb25zZScpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCFlcnIgJiYgYm9keS5lcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVyciA9IG5ldyBFcnJvcihib2R5LmVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICghZXJyKSBkZWJ1ZyhgcmVxOiAke3Jlc3BvbnNlLnJlcXVlc3QuaHJlZn0sIHJlc3A6ICR7cmVzcG9uc2UuYm9keS5lcnJvcn1gKTtcclxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgYm9keSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvLyBNYWtlIGEgcHVibGljIEFQSSByZXF1ZXN0XHJcbiAgICAgICAgX3B1YmxpYzogZnVuY3Rpb24oY29tbWFuZCwgcGFyYW1ldGVycywgY2FsbGJhY2spe1xyXG4gICAgICAgICAgICBsZXQgcGFyYW0gPSBwYXJhbWV0ZXJzO1xyXG4gICAgICAgICAgICBwYXJhbS5jb21tYW5kID0gY29tbWFuZDtcclxuICAgICAgICAgICAgbGV0IG9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICAgICAgdXJsOiBQVUJMSUNfQVBJX1VSTCxcclxuICAgICAgICAgICAgICAgIHFzOiBwYXJhbSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlcXVlc3Qob3B0aW9ucywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8vIE1ha2UgYSBwcml2YXRlIEFQSSByZXF1ZXN0XHJcbiAgICAgICAgX3ByaXZhdGU6IGZ1bmN0aW9uKGNvbW1hbmQsIHBhcmFtZXRlcnMsIGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgbGV0IHBhcmFtID0gcGFyYW1ldGVycztcclxuICAgICAgICAgICAgcGFyYW0uY29tbWFuZCA9IGNvbW1hbmQ7XHJcbiAgICAgICAgICAgIHBhcmFtLm5vbmNlID0gbm9uY2UoMTYpO1xyXG4gICAgICAgICAgICBsZXQgb3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICAgICAgdXJsOiBQUklWQVRFX0FQSV9VUkwsXHJcbiAgICAgICAgICAgICAgICBmb3JtOiBwYXJhbSxcclxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHRoaXMuX2dldFByaXZhdGVIZWFkZXJzKHBhcmFtKSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgaWYgKG9wdGlvbnMuaGVhZGVycykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlcXVlc3Qob3B0aW9ucywgY2FsbGJhY2spO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVyciA9IG5ldyBFcnJvcignRXJyb3I6IEFQSSBrZXkgYW5kIHNlY3JldCByZXF1aXJlZCcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyciwgbnVsbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICAvLyBQdWJsaWMgQVBJIE1ldGhvZHNcclxuXHJcbiAgICAgICAgcmV0dXJuVGlja2VyOiBmdW5jdGlvbihjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0ge307XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wdWJsaWMoJ3JldHVyblRpY2tlcicsIHBhcmFtZXRlcnMsIGNhbGxiYWNrKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICByZXR1cm4yNFZvbHVtZTogZnVuY3Rpb24oY2FsbGJhY2spe1xyXG4gICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHt9O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHVibGljKCdyZXR1cm4yNGhWb2x1bWUnLCBwYXJhbWV0ZXJzLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgcmV0dXJuT3JkZXJCb29rOiBmdW5jdGlvbihjdXJyZW5jeVBhaXIsIGRlcHRoLCBjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0ge1xyXG4gICAgICAgICAgICAgICAgY3VycmVuY3lQYWlyLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZiAoZGVwdGgpIHBhcmFtZXRlcnMuZGVwdGggPSBkZXB0aDtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3B1YmxpYygncmV0dXJuT3JkZXJCb29rJywgcGFyYW1ldGVycywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHJldHVyblRyYWRlSGlzdG9yeTogZnVuY3Rpb24oY3VycmVuY3lQYWlyLCBzdGFydCwgZW5kLCBjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0ge1xyXG4gICAgICAgICAgICAgICAgY3VycmVuY3lQYWlyLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZiAoc3RhcnQpIHBhcmFtZXRlcnMuc3RhcnQgPSBzdGFydDtcclxuICAgICAgICAgICAgaWYgKGVuZCkgcGFyYW1ldGVycy5lbmQgPSBlbmQ7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wdWJsaWMoJ3JldHVyblRyYWRlSGlzdG9yeScsIHBhcmFtZXRlcnMsIGNhbGxiYWNrKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICByZXR1cm5DaGFydERhdGE6IGZ1bmN0aW9uKGN1cnJlbmN5UGFpciwgcGVyaW9kLCBzdGFydCwgZW5kLCBjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0ge1xyXG4gICAgICAgICAgICAgICAgY3VycmVuY3lQYWlyLFxyXG4gICAgICAgICAgICAgICAgcGVyaW9kLFxyXG4gICAgICAgICAgICAgICAgc3RhcnQsXHJcbiAgICAgICAgICAgICAgICBlbmQsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wdWJsaWMoJ3JldHVybkNoYXJ0RGF0YScsIHBhcmFtZXRlcnMsIGNhbGxiYWNrKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICByZXR1cm5DdXJyZW5jaWVzOiBmdW5jdGlvbihjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0ge307XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wdWJsaWMoJ3JldHVybkN1cnJlbmNpZXMnLCBwYXJhbWV0ZXJzLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgcmV0dXJuTG9hbk9yZGVyczogZnVuY3Rpb24oY3VycmVuY3ksIGxpbWl0LCBjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0ge1xyXG4gICAgICAgICAgICAgICAgY3VycmVuY3ksXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlmIChsaW1pdCkgcGFyYW1ldGVycy5saW1pdCA9IGxpbWl0O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHVibGljKCdyZXR1cm5Mb2FuT3JkZXJzJywgcGFyYW1ldGVycywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIC8vIFRyYWRpbmcgQVBJIE1ldGhvZHNcclxuXHJcbiAgICAgICAgcmV0dXJuQmFsYW5jZXM6IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB7fTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3ByaXZhdGUoJ3JldHVybkJhbGFuY2VzJywgcGFyYW1ldGVycywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHJldHVybkNvbXBsZXRlQmFsYW5jZXM6IGZ1bmN0aW9uKGFjY291bnQsIGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB7fTtcclxuICAgICAgICAgICAgaWYgKGFjY291bnQpIHBhcmFtZXRlcnMuYWNjb3VudCA9YWNjb3VudDtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3ByaXZhdGUoJ3JldHVybkNvbXBsZXRlQmFsYW5jZXMnLCBwYXJhbWV0ZXJzLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgcmV0dXJuRGVwb3NpdEFkZHJlc3NlczogZnVuY3Rpb24oY2FsbGJhY2spe1xyXG4gICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHt9O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJpdmF0ZSgncmV0dXJuRGVwb3NpdEFkZHJlc3NlcycsIHBhcmFtZXRlcnMsIGNhbGxiYWNrKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBnZW5lcmF0ZU5ld0FkZHJlc3M6IGZ1bmN0aW9uKGN1cnJlbmN5LCBjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0ge1xyXG4gICAgICAgICAgICAgICAgY3VycmVuY3ksXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCdnZW5lcmF0ZU5ld0FkZHJlc3MnLCBwYXJhbWV0ZXJzLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgcmV0dXJuRGVwb3NpdHNXaXRoZHJhd2FsczogZnVuY3Rpb24oc3RhcnQsIGVuZCwgY2FsbGJhY2spe1xyXG4gICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0LFxyXG4gICAgICAgICAgICAgICAgZW5kLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJpdmF0ZSgncmV0dXJuRGVwb3NpdHNXaXRoZHJhd2FscycsIHBhcmFtZXRlcnMsIGNhbGxiYWNrKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICByZXR1cm5PcGVuT3JkZXJzOiBmdW5jdGlvbihjdXJyZW5jeVBhaXIsIGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW5jeVBhaXIsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCdyZXR1cm5PcGVuT3JkZXJzJywgcGFyYW1ldGVycywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHJldHVybk15VHJhZGVIaXN0b3J5OiBmdW5jdGlvbihjdXJyZW5jeVBhaXIsIHN0YXJ0LCBlbmQsIGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW5jeVBhaXIsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlmIChzdGFydCkgcGFyYW1ldGVycy5zdGFydCA9IHN0YXJ0O1xyXG4gICAgICAgICAgICBpZiAoZW5kKSBwYXJhbWV0ZXJzLmVuZCA9IGVuZDtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3ByaXZhdGUoJ3JldHVyblRyYWRlSGlzdG9yeScsIHBhcmFtZXRlcnMsIGNhbGxiYWNrKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICByZXR1cm5PcmRlclRyYWRlczogZnVuY3Rpb24ob3JkZXJOdW1iZXIsIGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB7XHJcbiAgICAgICAgICAgICAgICBvcmRlck51bWJlcixcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3ByaXZhdGUoJ3JldHVybk9yZGVyVHJhZGVzJywgcGFyYW1ldGVycywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGJ1eTogZnVuY3Rpb24oY3VycmVuY3lQYWlyLCByYXRlLCBhbW91bnQsIGZpbGxPcktpbGwsIGltbWVkaWF0ZU9yQ2FuY2VsLCBwb3N0T25seSwgY2FsbGJhY2spe1xyXG4gICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbmN5UGFpcixcclxuICAgICAgICAgICAgICAgIHJhdGUsXHJcbiAgICAgICAgICAgICAgICBhbW91bnQsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlmIChmaWxsT3JLaWxsKSBwYXJhbWV0ZXJzLmZpbGxPcktpbGwgPSBmaWxsT3JLaWxsO1xyXG4gICAgICAgICAgICBpZiAoaW1tZWRpYXRlT3JDYW5jZWwpIHBhcmFtZXRlcnMuaW1tZWRpYXRlT3JDYW5jZWwgPSBpbW1lZGlhdGVPckNhbmNlbDtcclxuICAgICAgICAgICAgaWYgKHBvc3RPbmx5KSBwYXJhbWV0ZXJzLnBvc3RPbmx5ID0gcG9zdE9ubHk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCdidXknLCBwYXJhbWV0ZXJzLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc2VsbDogZnVuY3Rpb24oY3VycmVuY3lQYWlyLCByYXRlLCBhbW91bnQsIGZpbGxPcktpbGwsIGltbWVkaWF0ZU9yQ2FuY2VsLCBwb3N0T25seSwgY2FsbGJhY2spe1xyXG4gICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbmN5UGFpcixcclxuICAgICAgICAgICAgICAgIHJhdGUsXHJcbiAgICAgICAgICAgICAgICBhbW91bnQsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlmIChmaWxsT3JLaWxsKSBwYXJhbWV0ZXJzLmZpbGxPcktpbGwgPSBmaWxsT3JLaWxsO1xyXG4gICAgICAgICAgICBpZiAoaW1tZWRpYXRlT3JDYW5jZWwpIHBhcmFtZXRlcnMuaW1tZWRpYXRlT3JDYW5jZWwgPSBpbW1lZGlhdGVPckNhbmNlbDtcclxuICAgICAgICAgICAgaWYgKHBvc3RPbmx5KSBwYXJhbWV0ZXJzLnBvc3RPbmx5ID0gcG9zdE9ubHk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCdzZWxsJywgcGFyYW1ldGVycywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNhbmNlbE9yZGVyOiBmdW5jdGlvbihvcmRlck51bWJlciwgY2FsbGJhY2spe1xyXG4gICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHtcclxuICAgICAgICAgICAgICAgIG9yZGVyTnVtYmVyLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJpdmF0ZSgnY2FuY2VsT3JkZXInLCBwYXJhbWV0ZXJzLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgbW92ZU9yZGVyOiBmdW5jdGlvbihvcmRlck51bWJlciwgcmF0ZSwgYW1vdW50LCBpbW1lZGlhdGVPckNhbmNlbCwgcG9zdE9ubHksIGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB7XHJcbiAgICAgICAgICAgICAgICBvcmRlck51bWJlcixcclxuICAgICAgICAgICAgICAgIHJhdGUsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlmIChhbW91bnQpIHBhcmFtZXRlcnMuYW1vdW50ID0gYW1vdW50O1xyXG4gICAgICAgICAgICBpZiAocG9zdE9ubHkpIHBhcmFtZXRlcnMucG9zdE9ubHkgPSBwb3N0T25seTtcclxuICAgICAgICAgICAgaWYgKGltbWVkaWF0ZU9yQ2FuY2VsKSBwYXJhbWV0ZXJzLmltbWVkaWF0ZU9yQ2FuY2VsID0gaW1tZWRpYXRlT3JDYW5jZWw7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCdtb3ZlT3JkZXInLCBwYXJhbWV0ZXJzLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgd2l0aGRyYXc6IGZ1bmN0aW9uKGN1cnJlbmN5LCBhbW91bnQsIGFkZHJlc3MsIGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW5jeSxcclxuICAgICAgICAgICAgICAgIGFtb3VudCxcclxuICAgICAgICAgICAgICAgIGFkZHJlc3MsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCd3aXRoZHJhdycsIHBhcmFtZXRlcnMsIGNhbGxiYWNrKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICByZXR1cm5GZWVJbmZvOiBmdW5jdGlvbihjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0ge307XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCdyZXR1cm5GZWVJbmZvJywgcGFyYW1ldGVycywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHJldHVybkF2YWlsYWJsZUFjY291bnRCYWxhbmNlczogZnVuY3Rpb24oYWNjb3VudCwgY2FsbGJhY2spe1xyXG4gICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHt9O1xyXG4gICAgICAgICAgICBpZiAoYWNjb3VudCkgcGFyYW1ldGVycy5hY2NvdW50ID0gYWNjb3VudDtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3ByaXZhdGUoJ3JldHVybkF2YWlsYWJsZUFjY291bnRCYWxhbmNlcycsIHBhcmFtZXRlcnMsIGNhbGxiYWNrKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICByZXR1cm5UcmFkYWJsZUJhbGFuY2VzOiBmdW5jdGlvbihjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0ge307XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCdyZXR1cm5UcmFkYWJsZUJhbGFuY2VzJywgcGFyYW1ldGVycywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHRyYW5zZmVyQmFsYW5jZTogZnVuY3Rpb24oY3VycmVuY3ksIGFtb3VudCwgZnJvbUFjY291bnQsIHRvQWNjb3VudCwgY2FsbGJhY2spe1xyXG4gICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHtcclxuICAgICAgICAgICAgICAgIGN1cnJlbmN5LFxyXG4gICAgICAgICAgICAgICAgYW1vdW50LFxyXG4gICAgICAgICAgICAgICAgZnJvbUFjY291bnQsXHJcbiAgICAgICAgICAgICAgICB0b0FjY291bnQsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCd0cmFuc2ZlckJhbGFuY2UnLCBwYXJhbWV0ZXJzLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgcmV0dXJuTWFyZ2luQWNjb3VudFN1bW1hcnk6IGZ1bmN0aW9uKGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB7fTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3ByaXZhdGUoJ3JldHVybk1hcmdpbkFjY291bnRTdW1tYXJ5JywgcGFyYW1ldGVycywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIG1hcmdpbkJ1eTogZnVuY3Rpb24oY3VycmVuY3lQYWlyLCByYXRlLCBhbW91bnQsIGxlbmRpbmdSYXRlLCBjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0ge1xyXG4gICAgICAgICAgICAgICAgY3VycmVuY3lQYWlyLFxyXG4gICAgICAgICAgICAgICAgcmF0ZSxcclxuICAgICAgICAgICAgICAgIGFtb3VudCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgaWYgKGxlbmRpbmdSYXRlKSBwYXJhbWV0ZXJzLmxlbmRpbmdSYXRlID0gbGVuZGluZ1JhdGU7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCdtYXJnaW5CdXknLCBwYXJhbWV0ZXJzLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgbWFyZ2luU2VsbDogZnVuY3Rpb24oY3VycmVuY3lQYWlyLCByYXRlLCBhbW91bnQsIGxlbmRpbmdSYXRlLCBjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0ge1xyXG4gICAgICAgICAgICAgICAgY3VycmVuY3lQYWlyLFxyXG4gICAgICAgICAgICAgICAgcmF0ZSxcclxuICAgICAgICAgICAgICAgIGFtb3VudCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgaWYgKGxlbmRpbmdSYXRlKSBwYXJhbWV0ZXJzLmxlbmRpbmdSYXRlID0gbGVuZGluZ1JhdGU7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCdtYXJnaW5TZWxsJywgcGFyYW1ldGVycywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGdldE1hcmdpblBvc2l0aW9uOiBmdW5jdGlvbihjdXJyZW5jeVBhaXIsIGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW5jeVBhaXIsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCdnZXRNYXJnaW5Qb3NpdGlvbicsIHBhcmFtZXRlcnMsIGNhbGxiYWNrKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBjbG9zZU1hcmdpblBvc2l0aW9uOiBmdW5jdGlvbihjdXJyZW5jeVBhaXIsIGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW5jeVBhaXIsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCdjbG9zZU1hcmdpblBvc2l0aW9uJywgcGFyYW1ldGVycywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGNyZWF0ZUxvYW5PZmZlcjogZnVuY3Rpb24oY3VycmVuY3ksIGFtb3VudCwgZHVyYXRpb24sIGF1dG9SZW5ldywgbGVuZGluZ1JhdGUsIGNhbGxiYWNrKXtcclxuICAgICAgICAgICAgbGV0IHBhcmFtZXRlcnMgPSB7XHJcbiAgICAgICAgICAgICAgICBjdXJyZW5jeSxcclxuICAgICAgICAgICAgICAgIGFtb3VudCxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICAgICAgICAgICAgYXV0b1JlbmV3LFxyXG4gICAgICAgICAgICAgICAgbGVuZGluZ1JhdGUsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCdjcmVhdGVMb2FuT2ZmZXInLCBwYXJhbWV0ZXJzLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgY2FuY2VsTG9hbk9mZmVyOiBmdW5jdGlvbihvcmRlck51bWJlciwgY2FsbGJhY2spe1xyXG4gICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHtcclxuICAgICAgICAgICAgICAgIG9yZGVyTnVtYmVyLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJpdmF0ZSgnY2FuY2VsTG9hbk9mZmVyJywgcGFyYW1ldGVycywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHJldHVybk9wZW5Mb2FuT2ZmZXJzOiBmdW5jdGlvbihjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0ge307XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9wcml2YXRlKCdyZXR1cm5PcGVuTG9hbk9mZmVycycsIHBhcmFtZXRlcnMsIGNhbGxiYWNrKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICByZXR1cm5BY3RpdmVMb2FuczogZnVuY3Rpb24oY2FsbGJhY2spe1xyXG4gICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHt9O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJpdmF0ZSgncmV0dXJuQWN0aXZlTG9hbnMnLCBwYXJhbWV0ZXJzLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgcmV0dXJuTGVuZGluZ0hpc3Rvcnk6IGZ1bmN0aW9uKHN0YXJ0LCBlbmQsIGxpbWl0LCBjYWxsYmFjayl7XHJcbiAgICAgICAgICAgIGxldCBwYXJhbWV0ZXJzID0ge1xyXG4gICAgICAgICAgICAgICAgc3RhcnQsXHJcbiAgICAgICAgICAgICAgICBlbmQsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlmIChsaW1pdCkgcGFyYW1ldGVycy5saW1pdCA9IGxpbWl0O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJpdmF0ZSgncmV0dXJuTGVuZGluZ0hpc3RvcnknLCBwYXJhbWV0ZXJzLCBjYWxsYmFjayk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgdG9nZ2xlQXV0b1JlbmV3OiBmdW5jdGlvbihvcmRlck51bWJlciwgY2FsbGJhY2spe1xyXG4gICAgICAgICAgICBsZXQgcGFyYW1ldGVycyA9IHtcclxuICAgICAgICAgICAgICAgIG9yZGVyTnVtYmVyLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fcHJpdmF0ZSgndG9nZ2xlQXV0b1JlbmV3JywgcGFyYW1ldGVycywgY2FsbGJhY2spO1xyXG4gICAgICAgIH0sXHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIFBvbG9uaWV4O1xyXG59KSgpO1xyXG4iXX0=