import chai from 'chai'
import Debug from "debug"
import Poloniex from '../../lib/poloniex.mjs'

const expect = chai.expect

const delay = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms))

describe('WebSocket tests - ESM', function () {
  describe('Public WebSocket', function () {
    let ws

    before(function () {
      Debug.enable('plx:ws:pub')
      const polo = new Poloniex()
      ws = polo.newPublicWebSocket()
    })

    after(function () {
      Debug.enable('plx:ws:pub')
    })

    it('should connect and emit open', function (done) {
      ws.on('open', () => {
        done()
      })
    })

    it('should confirm subscription', function (done) {
      ws.on('message', (message) => {
        let data = JSON.parse(message)
        if(data.event === 'subscribe' && data.channel === 'symbols' && data.symbols.includes('BTC_USDT')) {
          done()
        }
      })

      ws.send({
        event: "subscribe",
        channel: ["symbols"],
        symbols: ["BTC_USDT"]
      })
    })

    it('should receive pong messages', function (done) {
      ws.on('message', (message) => {
        let data = JSON.parse(message)
        if(data.event === 'pong') {
          done()
        }
      })
    })

    it('can be closed', function (done) {
      ws.on('close', (reason, code) => {
        done()
      })
      ws.close()
    })
  })

  describe('Authenticated WebSocket', function () {
    let ws

    before(function () {
      Debug.enable('plx:ws:auth')
      const polo = new Poloniex({ apiKey: process.env.apiKey, apiSecret: process.env.apiSecret })
      ws = polo.newAuthenticatedWebSocket()
    })

    after(function () {
      Debug.enable('plx:ws:auth')
    })

    it('should connect and emit open', function (done) {
      ws.on('open', () => {
        done()
      })
    })

    it('should authenticate automatically and confirm subscription', function (done) {
      ws.on('message', (message) => {
        let data = JSON.parse(message)
        if (data.channel === 'auth' && data.data.success) {
          ws.send({
            event: 'subscribe',
            channel: ['balances']
          })
        }

        if(data.event === 'subscribe' && data.channel === 'balances') {
          done()
        }
      })
    })

    it('should receive pong messages', function (done) {
      ws.on('message', (message) => {
        let data = JSON.parse(message)
        if(data.event === 'pong') {
          done()
        }
      })
    })

    it('can be closed', function (done) {
      ws.on('close', (reason, code) => {
        done()
      })
      ws.close()
    })
  })
})
