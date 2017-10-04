const expect = require('chai').expect;
const Poloniex = require('../lib/poloniex.js');

describe("Integration Test", function () {
  describe('Callback tests', function () {
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
				poloniex.returnTradeHistory('BTC_XMR', null, null, null, (error, response) => {
					expect(error).not.to.be.an.instanceOf(Error);
					expect(response).to.be.an('array');
					done();
				});
			});
      it('should return data with limit', function (done) {
        let poloniex = new Poloniex();
        poloniex.returnTradeHistory('BTC_XMR', null, null, 10, (error, response) => {
          expect(error).not.to.be.an.instanceOf(Error);
          expect(response.length).to.equal(10);
          done();
        });
      });
      it('should return data when limit is not passed', function (done) {
        let poloniex = new Poloniex();
        poloniex.returnTradeHistory('BTC_XMR', null, null, (error, response) => {
          expect(error).not.to.be.an.instanceOf(Error);
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
    describe('returnCompleteBalances', function () {
      it('should return data', function (done) {
      	if (!process.env.APIKEY || !process.env.APISECRET) {
      		done();
      		return;
				}

        let poloniex = new Poloniex(process.env.APIKEY, process.env.APISECRET);
        poloniex.returnCompleteBalances('all', (error, response) => {
          expect(error).not.to.be.an.instanceOf(Error);
          expect(response).to.be.an('object');
          done();
        });
      });
    });
    describe('returnMyTradeHistory', function () {
      it('should return data with limit', function (done) {
        if (!process.env.APIKEY || !process.env.APISECRET) {
          done();
          return;
        }

        let poloniex = new Poloniex(process.env.APIKEY, process.env.APISECRET);
        poloniex.returnMyTradeHistory('all', 1423526400, 1506956149, 10, (error, response) => {
          expect(error).not.to.be.an.instanceOf(Error);
          expect(response).to.be.an('object');
          done();
        });
      });
      it('should return data when limit is not passed', function (done) {
        if (!process.env.APIKEY || !process.env.APISECRET) {
          done();
          return;
        }

        let poloniex = new Poloniex(process.env.APIKEY, process.env.APISECRET);
        poloniex.returnMyTradeHistory('all', 1423526400, 1506956149, (error, response) => {
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
			it('should return error when socketTimeout = 1', function (done) {
				let poloniex = new Poloniex({ socketTimeout: 1 });
				poloniex.returnTicker((error, response) => {
					expect(error).to.be.an.instanceOf(Error);
					done();
				});
			});
		});
    describe('Missing parameter tests', function () {
      it('should throw error when missing parameter for public API method', function (done) {
        if (!process.env.APIKEY || !process.env.APISECRET) {
          done();
          return;
        }

        let poloniex = new Poloniex(process.env.APIKEY, process.env.APISECRET);
        expect(function () {
          poloniex.returnOrderBook((error, response) => {});
        }).to.throw('Invalid parameters');
        done();
      });
      it('should throw error when missing parameter for trading API method', function (done) {
        if (!process.env.APIKEY || !process.env.APISECRET) {
          done();
          return;
        }

        let poloniex = new Poloniex(process.env.APIKEY, process.env.APISECRET);
        expect(function () {
          poloniex.returnCompleteBalances((error, response) => {});
				}).to.throw('Invalid parameters');
        done();
      });
    });
  });
  describe('Promise tests', function () {
    describe('returnTicker', function () {
      it('should return data', function (done) {
        let poloniex = new Poloniex();
        poloniex.returnTicker().then((response) => {
          expect(response).to.be.an('object');
          done();
        }).catch(done);
      });
    });
    describe('return24Volume', function () {
      it('should return data', function (done) {
        let poloniex = new Poloniex();
        poloniex.return24Volume().then((response) => {
          expect(response).to.be.an('object');
          done();
        }).catch(done);
      });
    });
    describe('returnOrderBook', function () {
      it('should return data', function (done) {
        let poloniex = new Poloniex();
        poloniex.returnOrderBook('BTC_XMR', null).then((response) => {
          expect(response).to.be.an('object');
          done();
        }).catch(done);
      });
    });
    describe('returnTradeHistory', function () {
      it('should return data', function (done) {
        let poloniex = new Poloniex();
        poloniex.returnTradeHistory('BTC_XMR', null, null).then((response) => {
          expect(response).to.be.an('array');
          done();
        }).catch(done);
      });
    });
    describe('returnChartData', function () {
      it('should return data', function (done) {
        let poloniex = new Poloniex();
        let end = Date.now() / 1000;
        let start = end - 1000 * 60 * 60 / 1000;
        let period = 300;
        poloniex.returnChartData('BTC_XMR', period, start, end).then((response) => {
          expect(response).to.be.an('array');
          done();
        }).catch(done);
      });
    });
    describe('returnCurrencies', function () {
      it('should return data', function (done) {
        let poloniex = new Poloniex();
        poloniex.returnCurrencies().then((response) => {
          expect(response).to.be.an('object');
          done();
        }).catch(done);
      });
    });
    describe('returnLoanOrders', function () {
      it('should return data', function (done) {
        let poloniex = new Poloniex();
        poloniex.returnLoanOrders('BTC', null).then((response) => {
          expect(response).to.be.an('object');
          done();
        }).catch(done);
      });
    });
    it('should not resolve the promise. Forcing error socketTimeout = 1', function (done) {
      let poloniex = new Poloniex({ socketTimeout: 1 });
      poloniex.returnTicker().catch((error) => {
        expect(error).to.be.an.instanceOf(Error);
        done();
      });
    });
    describe('Trading API Methods', function () {
      it('should require API key and secret', function (done) {
        let poloniex = new Poloniex();
        poloniex.returnBalances().catch((error) => {
          expect(error).to.be.an.instanceOf(Error);
          done();
        });
      });
      it('should return error when invalid API key/secret pair', function (done) {
        let poloniex = new Poloniex('invalid key', 'invalid secret');
        poloniex.returnBalances().catch((error) => {
          expect(error).to.be.an.instanceOf(Error);
          done();
        });
      });
    });
  });
});
