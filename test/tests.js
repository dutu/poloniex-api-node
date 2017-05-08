
const expect = require('chai').expect;
const Poloniex = require('../lib/poloniex.js');

describe('Unit Test', function () {
  describe("Constructor", function () {
    it('should create a new instance', function () {
      let poloniex = new Poloniex();
      expect(poloniex).to.be.an.instanceOf(Poloniex);
    });
    it('should create a new instance with parameter options', function () {
      let poloniex = new Poloniex({ socketTimeout: 15000 });
      expect(poloniex).to.be.an.instanceOf(Poloniex);
      expect(poloniex.options.socketTimeout).to.equal(15000);
    });
  });
});

describe("Integration Test", function () {
  describe('returnTicker', function () {
    it('should return data', function (done) {
      let poloniex = new Poloniex();
      poloniex.returnTicker((error, response) => {
        expect(error).not.to.be.an.instanceOf(Error);
        expect(response).to.be.an('object');
        done();
      });
    });
  });
  describe('return24Volume', function () {
    it('should return data', function (done) {
      let poloniex = new Poloniex();
      poloniex.return24Volume((error, response) => {
        expect(error).not.to.be.an.instanceOf(Error);
        expect(response).to.be.an('object');
        done();
      });
    });
  });
  describe('returnOrderBook', function () {
    it('should return data', function (done) {
      let poloniex = new Poloniex();
      poloniex.returnOrderBook('BTC_XMR', null, (error, response) => {
        expect(error).not.to.be.an.instanceOf(Error);
        expect(response).to.be.an('object');
        done();
      });
    });
  });
  describe('returnTradeHistory', function () {
    it('should return data', function (done) {
      let poloniex = new Poloniex();
      poloniex.returnTradeHistory('BTC_XMR', null, null, (error, response) => {
        expect(error).not.to.be.an.instanceOf(Error);
        expect(response).to.be.an('array');
        done();
      });
    });
  });
  describe('returnChartData', function () {
    it('should return data', function (done) {
      let poloniex = new Poloniex();
      let end = Date.now();
      let start = end - 1000 * 60 * 60;
      let period = 300;
      poloniex.returnChartData('BTC_XMR', period, start, end, (error, response) => {
        expect(error).not.to.be.an.instanceOf(Error);
        expect(response).to.be.an('array');
        done();
      });
    });
  });
  describe('returnCurrencies', function () {
    it('should return data', function (done) {
      let poloniex = new Poloniex();
      poloniex.returnCurrencies((error, response) => {
        expect(error).not.to.be.an.instanceOf(Error);
        expect(response).to.be.an('object');
        done();
      });
    });
  });
  describe('returnLoanOrders', function () {
    it('should return data', function (done) {
      let poloniex = new Poloniex();
      poloniex.returnLoanOrders('BTC', null, (error, response) => {
        expect(error).not.to.be.an.instanceOf(Error);
        expect(response).to.be.an('object');
        done();
      });
    });
  });
  describe('Trading API Methods', function () {
    it('should require API key and secret', function (done) {
      let poloniex = new Poloniex();
      poloniex.returnBalances((error, response) => {
        expect(error).to.be.an.instanceOf(Error);
        done();
      });
    });
    it('should return error when invalid API key/secret pair', function (done) {
      let poloniex = new Poloniex('invalid key', 'invalid secret');
      poloniex.returnBalances((error, response) => {
        expect(error).to.be.an.instanceOf(Error);
        done();
      });
    });
  });
  describe('Options tests', function () {
    it('should return error socketTimeout = 1', function (done) {
      let poloniex = new Poloniex({ socketTimeout: 1 });
      poloniex.returnTicker((error, response) => {
        expect(error).to.be.an.instanceOf(Error);
        done();
      });
    });
  });

});
