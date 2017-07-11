'use strict';

//const Poloniex = require ('poloniex-api-node');
const Poloniex = require ('../lib/poloniex.js');
let poloniex = new Poloniex();

poloniex.returnTicker().then((ticker) => {
  console.log(ticker);
}).catch((err) => {
  console.log(err.message);
});

poloniex.returnLoanOrders('BTC', null).then((loanOrders) => {
  console.log(loanOrders);
}).catch((err) => {
  console.log(err.message);
});

poloniex.returnBalances().then((balances) => {
  console.log(balances);
}).catch((err) => {
  console.log(err.message);
});

