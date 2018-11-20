const chai = require('chai');
const expect = chai.expect;

const Poloniex = require('../lib/poloniex.js');
const TIMEOUT = 10000;

describe("Integration Test - WebSocket", function () {
  describe('openWebSocket', function () {
    it('should emit "open" event when no subscriptions', function (done) {
      let timeoutId;
      let poloniex = new Poloniex();
      let eventHandler = function eventHandler() {
        clearTimeout(timeoutId);
        poloniex.closeWebSocket();
        done();
      };
      poloniex.on('open', eventHandler);
      poloniex.openWebSocket();
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        poloniex.closeWebSocket();
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
        if (!isDoneCalled) {
          poloniex.closeWebSocket();
          isDoneCalled = true;
          done();
        }
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
        poloniex.closeWebSocket();
        done();
      }, TIMEOUT * 2);
    });
    it('should reset/reopen and open connection', function (done) {
      let poloniex = new Poloniex();
      let timeoutId;
      let eventHandler = function eventHandler(details, reason) {
        clearTimeout(timeoutId);
        poloniex.closeWebSocket();
        done();
      };
      poloniex.on('open', (details) => {
        poloniex.closeWebSocket();
      });
      poloniex.on('close', eventHandler);
      poloniex.openWebSocket();
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        poloniex.closeWebSocket();
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
        poloniex.closeWebSocket();
        done();
      });
    });
    it('should subscribe and emit "ticker" message', function (done) {
      let count = 400;
      let poloniex = new Poloniex();
      let timeoutId;
      let isDoneCalled = false;
      let eventHandler = function eventHandler(channelName, data) {
        clearTimeout(timeoutId);
        expect(channelName).to.be.eql('ticker');
        expect(data).to.have.all.keys('currencyPair', 'last', 'lowestAsk', 'highestBid', 'percentChange', 'baseVolume', 'quoteVolume', 'isFrozen', '24hrHigh', '24hrLow');
        expect(data.isFrozen).to.be.an('number');
        ['currencyPair', 'last', 'lowestAsk', 'highestBid', 'percentChange', 'baseVolume', 'quoteVolume', '24hrHigh', '24hrLow'].forEach(key => expect(key).to.be.a('string'));
        count -= 1
        if (!isDoneCalled && count === 0) {
          poloniex.closeWebSocket();
          isDoneCalled = true;
          done();
        }
      };
      poloniex.openWebSocket();
      poloniex.on('open', () => {
        poloniex.subscribe('ticker');
        expect(poloniex.subscriptions).to.deep.include({channelName: 'ticker', channelSubscription: null});
      });
      poloniex.on('message', eventHandler);
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        poloniex.closeWebSocket();
        done();
      }, TIMEOUT * 3);
    });
    it('should subscribe and emit "orderbook" for currencyPair', function (done) {
      let poloniex = new Poloniex();
      let timeoutId;
      let isDoneCalled = false;
      let eventHandler = function eventHandler(channelName, data) {
        clearTimeout(timeoutId);
        expect(channelName).to.be.eql('BTC_ETH');
        expect(data).to.be.an('array');
        if (!isDoneCalled) {
          expect(data[0].type).to.be.eql('orderBook')
          poloniex.closeWebSocket();
          isDoneCalled = true;
          done();
        }
      };
      poloniex.openWebSocket();
      poloniex.on('open', () => {
        poloniex.subscribe('BTC_ETH');
        expect(poloniex.subscriptions).to.deep.include({channelName: 'BTC_ETH', channelSubscription: null});
      });
      poloniex.on('message', eventHandler);
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        poloniex.closeWebSocket();
        done();
      }, TIMEOUT * 2);
    });
    it('should subscribe and emit "volume" message', function (done) {
      let poloniex = new Poloniex();
      let timeoutId;
      let isDoneCalled = false;
      let eventHandler = function eventHandler(channelName, data) {
        clearTimeout(timeoutId);
        expect(channelName).to.be.eql('volume');
        expect(data).to.be.an('object');
        expect(data.serverTime).to.be.a('string');
        expect(data.usersOnline).to.be.a('number');
        expect(data.volume).to.be.an('object');
        if (!isDoneCalled) {
          poloniex.closeWebSocket();
          isDoneCalled = true;
          done();
        }
      };
      poloniex.openWebSocket();
      poloniex.on('open', () => {
        poloniex.subscribe('volume');
        expect(poloniex.subscriptions).to.deep.include({channelName: 'volume', channelSubscription: null});
      });
      poloniex.on('message', eventHandler);
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        poloniex.closeWebSocket();
        done();
      }, TIMEOUT * 2.5);
    });
    it('should subscribe and emit "accountNotifications" message', function (done) {
      let poloniex = new Poloniex(process.env.APIKEY, process.env.APISECRET);
      let timeoutId;
      let isDoneCalled = false;
      let eventHandler = function eventHandler(channelName, data) {
        clearTimeout(timeoutId);
        expect(channelName).to.be.eql('accountNotifications');
        if (!isDoneCalled) {
          expect(data).to.be.eql('subscriptionSucceeded');
          poloniex.closeWebSocket();
          isDoneCalled = true;
          done();
        }
      };
      poloniex.openWebSocket();
      poloniex.on('open', () => {
        poloniex.subscribe('accountNotifications');
        expect(poloniex.subscriptions).to.deep.include({channelName: 'accountNotifications', channelSubscription: null});
      });
      poloniex.on('message', eventHandler);
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        poloniex.closeWebSocket();
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
        if (isDoneCalled) {
          return;
        }
        poloniex.unsubscribe('ticker');
        expect(poloniex.subscriptions).to.eql([]);
        isDoneCalled = true;
        poloniex.closeWebSocket();
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
        poloniex.closeWebSocket();
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
        poloniex.closeWebSocket();
        done();
      };
      poloniex.on('open', () => {
        poloniex.closeWebSocket();
      });
      poloniex.on('close', eventHandler);
      poloniex.openWebSocket();
      timeoutId = setTimeout(function() {
        expect(false, 'expected eventHandler to have been called').to.be.ok;
        poloniex.closeWebSocket();
        done();
      }, TIMEOUT);
    });
  });
});

