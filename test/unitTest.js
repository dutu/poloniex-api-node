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
	describe('returnTicker', function () {
		it('should return a promise if callback function is not present.', function (done) {
			let poloniex = new Poloniex();
			expect(poloniex.returnTicker()).to.be.an.instanceof(Promise);
			done();
		});
		it('should not return a promise if callback function is present.', function (done) {
			let poloniex = new Poloniex();
			expect(poloniex.returnTicker((error, response) => { })).to.not.be.an.instanceof(Promise);
			done();
		});
	});
	describe('return24Volume', function () {
		it('should return a promise if callback function is not present.', function (done) {
			let poloniex = new Poloniex();
			expect(poloniex.return24Volume()).to.be.an.instanceof(Promise);
			done();
		});
		it('return24Volume should not return a promise if callback function is not present.', function (done) {
			let poloniex = new Poloniex();
			expect(poloniex.return24Volume((error, response) => { })).to.not.be.an.instanceof(Promise);
			done();
		});
	});
	describe('returnOrderBook', function () {
		it('should return a promise if callback function is not present.', function (done) {
			let poloniex = new Poloniex();
			expect(poloniex.returnOrderBook('BTC_XMR')).to.be.an.instanceof(Promise);
			done();
		});
		it('should not return a promise if callback function is present.', function (done) {
			let poloniex = new Poloniex();
			expect(poloniex.returnOrderBook('BTC_XMR', null, (error, response) => { })).to.not.be.an.instanceof(Promise);
			done();
		});
	});
	describe('returnTradeHistory', function () {
		it('should return a promise if callback function is not present.', function (done) {
			let poloniex = new Poloniex();
			expect(poloniex.returnTradeHistory('BTC_XMR', null, null, null)).to.be.an.instanceof(Promise);
			done();
		});
		it('should not return a promise if callback function is present.', function (done) {
			let poloniex = new Poloniex();
			expect(poloniex.returnTradeHistory('BTC_XMR', null, null, null, (error, response) => { })).to.not.be.an.instanceof(Promise);
			done();
		});
	});
	describe('returnChartData', function () {
		it('should return a promise if callback function is not present.', function (done) {
			let poloniex = new Poloniex();
			let end = Date.now();
			let start = end - 1000 * 60 * 60;
			let period = 300;
			expect(poloniex.returnChartData('BTC_XMR', period, start, end)).to.be.an.instanceof(Promise);
			done();
		});
		it('should not return a promise if callback function is present.', function (done) {
			let poloniex = new Poloniex();
			let end = Date.now();
			let start = end - 1000 * 60 * 60;
			let period = 300;
			expect(poloniex.returnChartData('BTC_XMR', period, start, end, (error, response) => { })).to.not.be.an.instanceof(Promise);
			done();
		});
	});
	describe('returnCurrencies', function () {
		it('should return a promise if callback function is not present.', function (done) {
			let poloniex = new Poloniex();
			expect(poloniex.returnCurrencies()).to.be.an.instanceof(Promise);
			done();
		});
		it('should not return a promise if callback function is present.', function (done) {
			let poloniex = new Poloniex();
			expect(poloniex.returnCurrencies((error, response) => { })).to.not.be.an.instanceof(Promise);
			done();
		});
	});
	describe('returnLoanOrders', function () {
		it('should return a promise if callback function is not present.', function (done) {
			let poloniex = new Poloniex();
			expect(poloniex.returnCurrencies()).to.be.an.instanceof(Promise);
			done();
		});
		it('should not return a promise if callback function is present.', function (done) {
			let poloniex = new Poloniex();
			expect(poloniex.returnCurrencies((error, response) => { })).to.not.be.an.instanceof(Promise);
			done();
		});
	});
});
