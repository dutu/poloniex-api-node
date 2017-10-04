const chai = require('chai');
const expect = chai.expect;

const Poloniex = require('../lib/poloniex.js');
const TIMEOUT = 60000;

describe("Integration Test - WebSocket1", function () {
  describe('openWebSocket', function () {
    it('should emit "open" event when no subscriptions', function (done) {
      let timeoutId;
      let poloniex = new Poloniex();
      let eventHandler = function eventHandler() {
        clearTimeout(timeoutId);
        done();
      };
      poloniex.on('open', eventHandler);
      poloniex.openWebSocket();
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        done();
      }, TIMEOUT);
    });
    it('should emit "open" event and subscribe when subscription exists', function (done) {
      let poloniex = new Poloniex();
      let timeoutId;
      let isDoneCalled = false;
      let isOpenReceived = false;
      let eventHandler = function eventHandler(channelName, data, seq) {
        clearTimeout(timeoutId);
        expect(isOpenReceived).to.be.true;
        isDoneCalled || done();
        isDoneCalled = true;
      };
      poloniex.subscribe('ticker');
      poloniex.on('open', () => {
        isOpenReceived = true;
        expect(poloniex.subscriptions).to.deep.include({channelName: 'ticker', channelSubscription: null});
      });
      poloniex.on('message', eventHandler);
      poloniex.openWebSocket();
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        done();
      }, TIMEOUT * 2);
    });
    it('should reset/reopen an open connection', function (done) {
      let poloniex = new Poloniex();
      let timeoutId;
      let eventHandler = function eventHandler(details, reason) {
        clearTimeout(timeoutId);
        done();
      };
      poloniex.on('open', (details) => {
        poloniex.closeWebSocket();
      });
      poloniex.on('close', eventHandler);
      poloniex.openWebSocket();
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        done();
      }, TIMEOUT * 2);
    });
  });
  describe('subscribe', function () {
    it('should add subscription with connection closed', function (done) {
      let poloniex = new Poloniex();
      expect(poloniex.subscriptions).to.eql([]);
      poloniex.subscribe('ticker');
      expect(poloniex.subscriptions).to.deep.include({channelName: 'ticker', channelSubscription: null});
      done();
    });
    it('should add subscription with connection open', function (done) {
      let poloniex = new Poloniex();
      poloniex.openWebSocket();
      poloniex.on('open', () => {
        poloniex.subscribe('ticker');
        expect(poloniex.subscriptions).to.deep.include({channelName: 'ticker', channelSubscription: null});
        done();
      });
    });
    it('should subscribe and emit "ticker" message', function (done) {
      let poloniex = new Poloniex();
      let timeoutId;
      let isDoneCalled = false;
      let eventHandler = function eventHandler(channelName, data) {
        clearTimeout(timeoutId);
        expect(channelName).to.be.eql('ticker');
        expect(data).to.have.all.keys('currencyPair', 'last', 'lowestAsk', 'highestBid', 'percentChange', 'baseVolume', 'quoteVolume', 'isFrozen', '24hrHigh', '24hrLow');
        isDoneCalled || done();
        isDoneCalled = true;
      };
      poloniex.openWebSocket();
      poloniex.on('open', () => {
        poloniex.subscribe('ticker');
        expect(poloniex.subscriptions).to.deep.include({channelName: 'ticker', channelSubscription: null});
      });
      poloniex.on('message', eventHandler);
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        done();
      }, TIMEOUT * 2);
    });
    it('should subscribe and emit currencyPair message', function (done) {
      let poloniex = new Poloniex();
      let timeoutId;
      let isDoneCalled = false;
      let eventHandler = function eventHandler(channelName, data) {
        clearTimeout(timeoutId);
        expect(channelName).to.be.eql('BTC_ETH');
        expect(data).to.be.an('array');
        isDoneCalled || done();
        isDoneCalled = true;
      };
      poloniex.openWebSocket();
      poloniex.on('open', () => {
        poloniex.subscribe('BTC_ETH');
        expect(poloniex.subscriptions).to.deep.include({channelName: 'BTC_ETH', channelSubscription: null});
      });
      poloniex.on('message', eventHandler);
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        done();
      }, TIMEOUT * 2);
    });
    it('should subscribe emit and "footer" message', function (done) {
      let poloniex = new Poloniex();
      let timeoutId;
      let isDoneCalled = false;
      let eventHandler = function eventHandler(channelName, data) {
        clearTimeout(timeoutId);
        expect(channelName).to.be.eql('footer');
        expect(data).to.be.an('array');
        isDoneCalled || done();
        isDoneCalled = true;
      };
      poloniex.openWebSocket();
      poloniex.on('open', () => {
        poloniex.subscribe('footer');
        expect(poloniex.subscriptions).to.deep.include({channelName: 'footer', channelSubscription: null});
      });
      poloniex.on('message', eventHandler);
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        done();
      }, TIMEOUT * 2);
    });
  });
  describe('unsubscribe', function () {
    it('should remove subscription with connection closed', function (done) {
      let poloniex = new Poloniex();
      expect(poloniex.subscriptions).to.eql([]);
      poloniex.subscribe('ticker');
      expect(poloniex.subscriptions).to.deep.include({channelName: 'ticker', channelSubscription: null});
      poloniex.unsubscribe('ticker');
      expect(poloniex.subscriptions).to.eql([]);
      done();
    });
    it('should remove subscription with connection open', function (done) {
      let poloniex = new Poloniex();
      let timeoutId;
      let isDoneCalled = false;
      let eventHandler = function eventHandler(channelName, data, seq) {
        clearTimeout(timeoutId);
        expect(channelName).to.be.eql('ticker');
        expect(data).to.have.all.keys('currencyPair', 'last', 'lowestAsk', 'highestBid', 'percentChange', 'baseVolume', 'quoteVolume', 'isFrozen', '24hrHigh', '24hrLow');
        if (isDoneCalled) {
          return;
        }

        poloniex.unsubscribe('ticker');
        expect(poloniex.subscriptions).to.eql([]);
        isDoneCalled = true;
        done();
      };
      poloniex.openWebSocket();
      poloniex.on('open', () => {
        poloniex.subscribe('ticker');
        expect(poloniex.subscriptions).to.deep.include({channelName: 'ticker', channelSubscription: null});
      });
      poloniex.on('message', eventHandler);
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        done();
      }, TIMEOUT * 2);
    });
  });
  describe('closeWebSocket', function () {
    it('should emit "close" event', function (done) {
      let timeoutId;
      let poloniex = new Poloniex();
      let eventHandler = function eventHandler(details) {
        clearTimeout(timeoutId);
        done();
      };
      poloniex.on('open', () => {
        poloniex.closeWebSocket();
      });
      poloniex.on('close', eventHandler);
      poloniex.openWebSocket();
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        done();
      }, TIMEOUT);
    });
  });
});

