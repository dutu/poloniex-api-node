'use strict';

//const Poloniex = require ('poloniex-api-node');
const Poloniex = require ('../lib/poloniex.js');
let poloniex = new Poloniex();

poloniex.returnTicker(function (err, ticker) {
    if (err) {
        console.log(err.message);
    } else {
        console.log(ticker);
    }
});

poloniex.returnLoanOrders('BTC', null, function (err, loanOrders) {
    if (err) {
        console.log(err.message);
    } else {
        console.log(loanOrders);
    }
});

poloniex.returnBalances(function (err, balances) {
    if (err) {
        console.log(err.message);
    } else {
        console.log(balances);
    }
});
