import chai from 'chai'
import Poloniex from '../lib/poloniex.mjs'

const expect = chai.expect

const delay = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms))

describe('REST tests', function () {
  const expectGetCallRateInfoResult = (result) => {
    expect(result).to.be.an('array').with.lengthOf(3)
    expect(result[0]).to.be.a('string').and.to.be.oneOf(['riPub', 'nriPub', 'riPriv', 'nriPriv'])
    expect(result[1]).to.be.a('number')
    expect(result[2]).to.be.a('number')
  }

  describe('Public methods', function () {
    const polo = new Poloniex()

    describe('getSymbol()', function () {
      it('should return an array of symbols', async function () {
        const result = await polo.getSymbols()
        expect(result).to.be.an('array')
        expect(result).to.satisfy(function (arr) {
          return arr.some((obj) => obj.symbol === 'BTC_USDT')
        })
      })

      it('should return one symbol', async function () {
        const result = await polo.getSymbols({ symbol: 'BTC_USDT' })
        expect(result).to.be.an('array').with.lengthOf(1)
        expect(result[0]).to.have.own.property('symbol', 'BTC_USDT')
      })

      it('should return api calls info', async function () {
        let result = polo.getSymbols( { getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
        result = polo.getSymbols({ symbol: 'BTC_USDT', getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
      })
    })

    describe('getCurrencies()', function () {
      it('should return an array of currencies', async function () {
        const result = await polo.getCurrencies()
        expect(result).to.be.an('array')
        expect(result).to.satisfy(function (arr) {
          return arr.some((obj) => obj.BTC)
        })
      })

      it('should return one currency', async function () {
        const result = await polo.getCurrencies({ currency: 'BTC' })
        expect(result).to.have.own.property('BTC')
      })

      it('should return api calls info', async function () {
        let result = polo.getCurrencies({ getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
        result = polo.getCurrencies({ currency: 'BTC', getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
      })
    })

    describe('getTimestamp()', function () {
      it('should return the serverTime', async function () {
        const result = await polo.getTimestamp()
        expect(result).to.have.own.property('serverTime')
      })

      it('should return api calls info', async function () {
        let result = polo.getTimestamp({ getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
      })
    })

    describe('getPrices()', function () {
      it('should return an array of prices', async function () {
        const result = await polo.getPrices()
        expect(result).to.be.an('array')
        expect(result).to.satisfy(function (arr) {
          return arr.some((obj) => obj.symbol === 'BTC_USDT' && Object(obj).hasOwnProperty('price'))
        })
      })

      it('should return one symbol', async function () {
        const result = await polo.getPrices({ symbol: 'BTC_USDT' })
        expect(result).to.have.own.property('symbol', 'BTC_USDT')
        expect(result).to.have.own.property('price')
      })

      it('should return api calls info', async function () {
        let result = polo.getPrices({ getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
        result = polo.getPrices({ symbol: 'BTC_USDT', getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
      })
    })

    describe('getMarkPrice()', function () {
      it('should return an array of prices', async function () {
        const result = await polo.getMarkPrice()
        expect(result).to.be.an('array')
        expect(result).to.satisfy(function (arr) {
          return arr.some((obj) => obj.symbol === 'BTC_USDT' && Object(obj).hasOwnProperty('markPrice'))
        })
      })

      it('should return one symbol', async function () {
        const result = await polo.getMarkPrice({ symbol: 'BTC_USDT' })
        expect(result).to.have.own.property('symbol', 'BTC_USDT')
        expect(result).to.have.own.property('markPrice')
      })

      it('should return api calls info', async function () {
        let result = polo.getMarkPrice({ getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
        result = polo.getMarkPrice({ symbol: 'BTC_USDT', getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
      })
    })

    describe('getMarkPriceComponents()', function () {
      it('should return one symbol', async function () {
        const result = await polo.getMarkPriceComponents({ symbol: 'BTC_USDT' })
        expect(result).to.have.own.property('symbol', 'BTC_USDT')
        expect(result).to.have.own.property('components')
      })

      it('should return api calls info', async function () {
        let result = polo.getMarkPriceComponents({ symbol: 'BTC_USDT',  getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
      })
    })

    describe('getOrderBook()', function () {
      it('should return one symbol', async function () {
        const result = await polo.getOrderBook({ symbol: 'BTC_USDT' })
        expect(result).to.have.own.property('asks')
      })

      it('should take optional parameters', async function () {
        const result = await polo.getOrderBook({ symbol: 'BTC_USDT', limit: 100, scale: '1' })
        expect(result).to.have.own.property('asks').with.lengthOf(200)
        expect(result).to.have.own.property('scale').equal('1')
      })

      it('should return api calls info', async function () {
        let result = polo.getOrderBook({ symbol: 'BTC_USDT', getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
      })
    })

    describe('getOrderCandles()', function () {
      it('should return one symbol', async function () {
        const result = await polo.getCandles({ symbol: 'BTC_USDT', interval: 'HOUR_1' })
        expect(result).to.be.an('array')
        result.forEach(function (subArray) {
          expect(subArray).to.be.an('array')
        })
      })

      it('should take optional parameters', async function () {
        const result = await polo.getCandles({ symbol: 'BTC_USDT', interval: 'HOUR_1', limit: 21 })
        expect(result).to.be.an('array').with.lengthOf(21)
      })

      it('should return api calls info', async function () {
        let result = polo.getCandles({ symbol: 'BTC_USDT', interval: 'HOUR_1', getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
      })
    })

    describe('getTrades()', function () {
      it('should return one symbol', async function () {
        const result = await polo.getTrades({ symbol: 'BTC_USDT' })
        expect(result).to.be.an('array')
        result.forEach(function (object) {
          expect(object).to.have.own.property('takerSide')
        })
      })

      it('should take optional parameters', async function () {
        const result = await polo.getTrades({ symbol: 'BTC_USDT', limit: 21 })
        expect(result).to.be.an('array').with.lengthOf(21)
      })

      it('should return api calls info', async function () {
        let result = polo.getTrades({ symbol: 'BTC_USDT', getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
      })
    })

    describe('getTicker()', function () {
      it('should return an array for all symbols', async function () {
        const result = await polo.getTicker()
        expect(result).to.be.an('array')
        result.forEach(function (subArray) {
          expect(subArray).to.have.own.property('dailyChange')
        })
      })

      it('should take optional parameters', async function () {
        const result = await polo.getTicker({ symbol: 'BTC_USDT' })
        expect(result).to.have.own.property('symbol').equal('BTC_USDT')
        expect(result).to.have.own.property('dailyChange')
      })

      it('should return api calls info', async function () {
        let result = await polo.getTicker({ getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
        result = polo.getTicker({ symbol: 'BTC_USDT', getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
      })
    })

    describe('getCollateralInfo()', function () {
      it('should return an array for all symbols', async function () {
        const result = await polo.getCollateralInfo()
        expect(result).to.be.an('array')
        result.forEach(function (object) {
          expect(object).to.have.own.property('collateralRate')
        })
      })

      it('should take optional parameters', async function () {
        const result = await polo.getCollateralInfo({ currency: 'BTC' })
        expect(result).to.have.own.property('currency').equal('BTC')
        expect(result).to.have.own.property('collateralRate')
      })

      it('should return api calls info', async function () {
        let result = await polo.getCollateralInfo({ getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
        result = polo.getCollateralInfo({ currency: 'BTC', getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
      })
    })

    describe('getBorrowRatesInfo()', function () {
      it('should return for all tiers', async function () {
        const result = await polo.getBorrowRatesInfo()
        expect(result).to.be.an('array')
        result.forEach(function (object) {
          expect(object).to.have.own.property('tier')
        })
      })

      it('should return api calls info', async function () {
        let result = polo.getBorrowRatesInfo({ getApiCallRateInfo : true })
        expectGetCallRateInfoResult(result)
      })

    })
  })

  describe('Authenticated methods', function () {
    const polo = new Poloniex({ apiKey: process.env.apiKey, apiSecret: process.env.apiSecret })

    describe('getAccountInfo()', function () {
      it('should return result', async function () {
        const result = await polo.getAccountInfo()
        expect(result).to.be.an('array')
        expect(result).to.satisfy(function (arr) {
          return arr.some((obj) => obj.symbol === 'BTC_USDT')
        })
      })
    })
  })

})

describe('API call rate info', function() {
  const polo = new Poloniex()
  describe('Property apiCallRate', function () {
    it('Should have correct structure and initial values zero', function() {
      for (const key of ['nriPriv', 'riPriv', 'nriPub', 'riPub']) {
        expect(polo.apiCallRate).to.have.property(key).that.is.equal(0)
      }
    })

    it('Can be set and it clears when time expires', async function() {
      for (const key of ['nriPriv', 'riPriv', 'nriPub', 'riPub']) {
        expect(polo.apiCallRate).to.have.property(key).that.is.equal(0)
        polo.apiCallRate[key] = 10
      }

      await delay(500)
      for (const key of ['nriPriv', 'riPriv', 'nriPub', 'riPub']) {
        expect(polo.apiCallRate).to.have.property(key).that.is.equal(10)
        polo.apiCallRate[key] = 20
      }

      await delay(600)
      for (const key of ['nriPriv', 'riPriv', 'nriPub', 'riPub']) {
        expect(polo.apiCallRate[key]).to.be.equal(10)
      }

      await delay(500)
      for (const key of ['nriPriv', 'riPriv', 'nriPub', 'riPub']) {
        expect(polo.apiCallRate[key]).to.be.equal(0)
      }
    })
  })

  describe('Parameter getApiCallRateInfo', function() {
    it('Should be accepted by all methods and integer returned', async function () {
      const result  = polo.getSymbols({ getApiCallRateInfo: true })
      expect(result).to.be.equal(0)
    })
  })
})
