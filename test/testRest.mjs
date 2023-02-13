import chai from 'chai'
import Poloniex from '../lib/poloniex.mjs'

const expect = chai.expect

describe('REST tests', function () {
  describe('Public methods', function () {
    const polo = new Poloniex({sandbox: true})

    describe('getSymbol()', function () {
      it('should return an array of symbols', async function () {
        const result = await polo.getSymbols()
          .catch((e) => {
            console.log(e)
          })
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

      it('should return api calls remaining', async function () {
        const result = polo.getSymbols(Symbol())
        expect(result).to.be.an('number')
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
    })

    describe('getTimestamp()', function () {
      it('should return the serverTime', async function () {
        const result = await polo.getTimestamp()
        expect(result).to.have.own.property('serverTime')
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
    })

    describe('getMarkPriceComponents()', function () {
      it('should return one symbol', async function () {
        const result = await polo.getMarkPriceComponents({ symbol: 'BTC_USDT' })
        expect(result).to.have.own.property('symbol', 'BTC_USDT')
        expect(result).to.have.own.property('components')
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
    })

    describe('getBorrowRatesInfo()', function () {
      it('should return for all tiers', async function () {
        const result = await polo.getBorrowRatesInfo()
        expect(result).to.be.an('array')
        result.forEach(function (object) {
          expect(object).to.have.own.property('tier')
        })
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
