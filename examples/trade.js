'use strict';

//const Poloniex = require ('poloniex-api-node');
const Poloniex = require ('../index.js');
let poloniex = new Poloniex();

poloniex.returnTicker(function (err, ticker) {
    if (!err)
        console.log(ticker);
});

poloniex.returnLoanOrders('BTC', function (err, loanOrders) {
    if (!err)
        console.log(loanOrders);
});

