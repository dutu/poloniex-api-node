import axios from 'axios'
import CryptoJS from 'crypto-js'
import Debug from 'debug'
import { ForeverWebSocket } from 'forever-websocket'

const dbg_rest = Debug('plx:rest')
const dbg_wsPub = Debug('plx:ws:pub')
const dbg_wsAuth = Debug('plx:ws:auth')

/**
 * Creates a new Poloniex object
 * @class Poloniex
 * @param {String} [apiKey]
 * @param {String} [apiSecret]
 * @returns this
 */
export default class Poloniex {
  // API endpoints
  static #baseUrl = {
    rest: 'https://api.poloniex.com',
    wsPrivate: 'wss://ws.poloniex.com/ws/private',
    wsPublic: 'wss://ws.poloniex.com/ws/public',
  }

  // API endpoints sets (for rate limits)
  #apiRateLimitsEndpointsSets = {
    // non-resource intensive private endpoints
    nriPriv: [
      'GET/accounts',
      'GET/accounts/balances',
      'GET/accounts/{id}/balances',
      'POST/accounts/transfer',
      'GET/accounts/transfer/{id}',
      'GET/subaccounts',
      'GET/subaccounts/{id}/balances',
      'GET/subaccounts/transfer/{id}',
      'GET/margin/accountMargin',
      'GET/margin/borrowStatus',
      'GET/margin/maxSize',
      'POST/orders',
      'GET/orders/{id}',
      'DELETE/orders/{id}',
      'GET/orders/{id}/trades',
      'POST/orders/killSwitch',
      'GET/orders/killSwitchStatus',
      'POST/smartorders',
      'GET/smartorders/{id}',
      'DELETE/smartorders/{id}',
    ],
    // resource intensive private endpoints
    riPriv: [
      'GET/accounts/transfer',
      'GET/accounts/activity',
      'GET/subaccounts/balances',
      'GET/subaccounts/transfer',
      'POST/subaccounts/transfer',
      'GET/feeinfo',
      'GET/wallets/addresses',
      'GET/wallets/addresses/{currency}',
      'POST/wallets/address',
      'POST/wallets/withdraw',
      'GET/wallets/activity',
      'GET/orders',
      'POST/orders/batch',
      'PUT/orders',
      'DELETE/orders/cancelByIds',
      'DELETE/orders',
      'GET/orders/history',
      'GET/smartorders',
      'PUT/smartorders',
      'DELETE/smartorders/cancelByIds',
      'DELETE/smartorders',
      'GET/smartorders/history',
      'GET/trades',
    ],
    // non-resource intensive public endpoints
    nriPub: [
      "GET/markets/{symbol}",
      "GET/markets/price",
      "GET/markets/{symbol}/price",
      "GET/markets/markPrice",
      "GET/markets/{symbol}/markPrice",
      "GET/markets/{symbol}/markPriceComponents",
      "GET/markets/{symbol}/orderBook",
      "GET/markets/{symbol}/candles",
      "GET/timestamp",
      "GET/markets/collateralInfo",
      "GET/markets/{currency}/collateralInfo",
      "GET/markets/borrowRatesInfo"
    ],
    // resource intensive public endpoints
    riPub: [
      "GET/markets",
      "GET/markets/{symbol}/trades",
      "GET/markets/ticker24h",
      "GET/markets/{symbol}/ticker24h",
      "GET/currencies",
      "GET/currencies/{currency}"
    ]
  }

  // API rate limits for endpoints sets
  #apiRateLimits = { riPub: 10, nriPub: 200, nriPriv: 50, riPriv: 10 }
  // timestamps of all API calls 
  #apiCallTimeStamps = {}

  #apiKey
  #apiSecret

  constructor({ apiKey = '', apiSecret = '' } = {}) {
    this.#apiKey = apiKey
    this.#apiSecret = apiSecret

    // makes the regexp sets from endpoint sets
    const makeRegexp = function makeRegexp(set) {
      return set.map((item) => {
        const regex = item.replace(/{([a-zA-Z0-9_]+)}/g, "[a-zA-Z0-9_]+");
        return new RegExp("^" + regex + "$");
      })
    }

    //convert endpoint sets to regexp sets
    for (const k of Object.keys(this.#apiRateLimitsEndpointsSets)) {
      this.#apiRateLimitsEndpointsSets[k] = makeRegexp(this.#apiRateLimitsEndpointsSets[k])
    }

    // define setters and getters which are storing API calls timestamps in appropriate arrays
    for (const key of Object.keys(this.apiCallRates)) {
      this.#apiCallTimeStamps[key] = []
      Object.defineProperty(this.apiCallRates, key, {
        get: () => {
          this.#removeExpiredTimestamps(key)
          return this.#apiCallTimeStamps[key].length
        },
        set: (value) => {
          this.#removeExpiredTimestamps(key)
          const n = value - this.#apiCallTimeStamps[key].length
          if (n > 0) {
            // add n elements to the array, with value Date.now()
            this.#apiCallTimeStamps[key] = [...this.#apiCallTimeStamps[key], ...Array(n).fill(Date.now())]
          } else {
            // remove -n elements from the array
            this.#apiCallTimeStamps[key].splice(0, -n)
          }
        }
      })
    }
  }

  // remove timestamps older than one second from API call timestamp array
  #removeExpiredTimestamps(key) {
    const timestampsArray = this.#apiCallTimeStamps[key]
    const now = Date.now()
    const oneMinuteAgo = now - 1000
    let index = 0
    while (index < timestampsArray.length && timestampsArray[index] <= oneMinuteAgo) {
      index += 1
    }

    timestampsArray.splice(0, index)
  }

  // Classifies the API call based on endpoint sets, returns the set name
  #classifyApiCall(method, path) {
    const endpoint = method + path
    for (const [setName, set] of Object.entries(this.#apiRateLimitsEndpointsSets)) {
      for (let j = 0; j < set.length; j += 1)
        if (set[j].test(endpoint)) {
          return setName
        }
    }
  }

// Copies all keys from src object to a destination object, except excludeKeys. It returns the destination object.
  static #cloneObjectExceptKeys(src = {}, excludeKeys = []) {
    const cloned = {}
    for (const key in src) {
      if (!excludeKeys.includes(key)) {
        cloned[key] = src[key]
      }
    }

    return cloned
  }

  #customErrorMessage(err) {
    let message
    let messageArr = []
    if (err.response?.status) messageArr.push(err.response.status)
    if (err.response?.statusText) messageArr.push(err.response.statusText)
    if (messageArr.length > 0) messageArr = [messageArr.join(' ') + ':']
    if (err.response?.data?.message) messageArr.push(err.response.data.message)
    if (messageArr.length > 0) {
      message = messageArr.join(' ')
    } else {
      message = err.message
    }

    const code = err.response?.data?.code || err.code
    return { message, code }
  }

  /**
   * Makes a request to a public API endpoint (no authentication is necessary)
   * 
   * @private
   * @param method
   * @param path
   * @param params
   * @param body
   * @param getApiCallRateInfo
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - returns either Poloniex result or API call rate information
   */
  #requestPub(method, path, params, body, getApiCallRateInfo) {
    if (getApiCallRateInfo) {
      const key = this.#classifyApiCall(method, path)
      return [key, this.apiCallRates[key], this.apiCallRateLimits[key]]
    }

    return new Promise((resolve, reject) => {
      const url = Poloniex.#baseUrl.rest + path
      axios({ method, url, params, data: body })
        .then((res) => resolve (res.data))
        .then((res) => resolve (res.data))
        .catch((err) => {
          const errData = this.#customErrorMessage(err)
          const error = new Error(errData.message)
          error.code = errData.code
          reject(error)
        })
    })
  }

  // Generates signed request headers
  static #getRequestHeaders(method, path, params, body, apiKey, apiSecret) {
    const timestamp = Date.now()
    // Composes the parameters string: the timestamp parameter and the list of parameters, sorted by ASCII order and delimited by &. All parameters are URL/UTF-8 encoded (i.e. space is encoded as "%20").
    const composeParamString = function (params, timestamp) {
      const values = [`signTimestamp=${timestamp}`]
      Object.entries(params).forEach(([k, v]) => values.push(`${k}=${encodeURIComponent(v)}`))
      return values.sort().join("&")
    }

    // Composes the body string. signTimestamp needs to be added, even if there is no body
    const composeBodyString = function (body, timestamp) {
      if (Object.keys(body).length > 0) {
        return `requestBody=${JSON.stringify(body)}` + `&signTimestamp=${timestamp}`
      } else {
        return `signTimestamp=${timestamp}`
      }
    }

    // Generates the digital signature
    const sign = function sign(method, path, requestString, apiSecret) {
      const payload = method + "\n" + path + "\n" + requestString
      const hmacData = CryptoJS.HmacSHA256(payload, apiSecret)
      return CryptoJS.enc.Base64.stringify(hmacData)
    }

    let requestString
    if (method === 'DELETE' || method === 'POST' || method === 'PUT') {
      requestString = composeBodyString(body, timestamp)
    } else {
      requestString = composeParamString(params, timestamp)
    }

    const signature = sign(method, path, requestString, apiSecret, timestamp)
    return {
      "Content-Type": "application/json",
      "key": apiKey,
      'signatureMethod': 'HmacSHA256',
      "signature": signature,
      "signTimestamp": timestamp
    }
  }

  /**
   * Makes a request to an authenticated API endpoint (API signature is required)
   * 
   * @private
   * @param method
   * @param path
   * @param params
   * @param body
   * @param getApiCallRateInfo
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - returns either Poloniex result or API call rate information
   */
  #requestAuth(method, path, params, body, getApiCallRateInfo) {
    if (getApiCallRateInfo) {
      const key = this.#classifyApiCall(method, path)
      return [key, this.apiCallRates[key], this.apiCallRateLimits[key]]
    }

    return new Promise((resolve, reject) => {
      const headers = Poloniex.#getRequestHeaders(method, path, params, body, this.#apiKey, this.#apiSecret)
      const url = Poloniex.#baseUrl.rest + path
      axios({ method, url, headers, params, data: body })
        .then((res) => resolve (res.data))
        .catch((err) => {
          const errData = this.#customErrorMessage(err)
          const error = new Error(errData.message)
          error.code = errData.code
          reject(error)
        })
    })
  }

  /**
   * API call rate limits for endpoints sets
   * @type {{riPriv: number, riPub: number, nriPub: number, nriPriv: number}}
   */
  apiCallRateLimits = {
    riPub: 10,
    nriPub: 200,
    nriPriv: 50,
    riPriv: 10
  }

  /**
   * Current call rate for resource-intensive and non-resource-intensive private and public API calls
   *
   * @type {{riPriv: number, riPub: number, nriPub: number, nriPriv: number}}
   */
  apiCallRates = {
      nriPub: 0,
      riPub: 0,
      nriPriv: 0,
      riPriv: 0,
    }

  /**
   * Get symbols and their trade info.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.symbol] - a single symbol name
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getSymbols(requestParameters) {
    const path = ['/markets', requestParameters?.symbol].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol', 'getApiCallRateInfo'])
    return this.#requestPub('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get supported currencies.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.currency] - a single currency
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getCurrencies(requestParameters) {
    const path = ['/currencies', requestParameters?.currency].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['currency', 'getApiCallRateInfo'])
    return this.#requestPub('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get current server time.
   *
   * @param {Object} [requestParameters]
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getTimestamp(requestParameters) {
    const path = '/timestamp'
    return this.#requestPub('GET', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get the latest trade price for symbols.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.symbol] - a single symbol
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getPrices(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'price'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol', 'getApiCallRateInfo'])
    return this.#requestPub('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get the latest mark price for cross margin symbols.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.symbol] - a single symbol
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getMarkPrice(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'markPrice'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol', 'getApiCallRateInfo'])
    return this.#requestPub('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get components of the mark price for a given symbol.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - a single symbol
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getMarkPriceComponents(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'markPriceComponents'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol', 'getApiCallRateInfo'])
    return this.#requestPub('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get the order book for a given symbol.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - a single symbol
   * @param {String} [requestParameters.scale] - controls aggregation by price
   * @param {Number} [requestParameters.limit] - controls aggregation by price
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getOrderBook(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'orderBook'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['orderBook', 'getApiCallRateInfo'])
    return this.#requestPub('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Returns OHLC for a symbol at given timeframe (interval).
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - a single symbol
   * @param {"MINUTE_1"|"MINUTE_5"|"MINUTE_10"|"MINUTE_15"|"MINUTE_30"|"HOUR_1"|"HOUR_2"|"HOUR_4"|"HOUR_6"|"HOUR_12"|"DAY_1"|"DAY_3"|"WEEK_1"|"MONTH_1"} requestParameters.interval - the unit of time to aggregate data by
   * @param {Number} [requestParameters.limit] - maximum number of records returned
   * @param {Number} [requestParameters.startTime] - filters by time
   * @param {Number} [requestParameters.endTime] - filters by time
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getCandles(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'candles'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['candles', 'getApiCallRateInfo'])
    return this.#requestPub('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Returns a list of recent trades.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - a single symbol
   * @param {Number} [requestParameters.limit] - maximum number of records returned
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getTrades(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'trades'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['trades', 'getApiCallRateInfo'])
    return this.#requestPub('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Returns ticker in last 24 hours for all symbols.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.symbol] - a single symbol
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getTicker(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'ticker24h'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol', 'getApiCallRateInfo'])
    return this.#requestPub('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get collateral information for currencies.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.currency] - a single currency
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getCollateralInfo(requestParameters) {
    const path = ['/markets', requestParameters?.currency, 'collateralInfo'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['currency', 'getApiCallRateInfo'])
    return this.#requestPub('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get borrow rates information for all tiers and currencies.
   *
   * @param {Object} [requestParameters]
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getBorrowRatesInfo(requestParameters) {
    const path = '/markets/borrowRatesInfo'
    return this.#requestPub('GET', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  // Authenticated Methods

  /**
   * Get a list of all accounts of a use.
   *
   * @param {Object} [requestParameters]
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getAccountsInfo(requestParameters) {
    const path = '/accounts'
    return this.#requestAuth('GET', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of accounts of a user with each account’s id, type and balances.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.id] - a single account
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getAccountsBalances(requestParameters) {
    const path = ['/accounts', requestParameters?.id, 'balances'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id', 'getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of activities such as airdrop, rebates, staking, credit/debit adjustments, and other (historical adjustments).
   *
   * @param {Object} [requestParameters]
   * @param {Number} [requestParameters.startTime] - trades filled before startTime will not be retrieved
   * @param {Number} [requestParameters.endTime] - trades filled after endTime will not be retrieved
   * @param {Number} [requestParameters.activityType] - type of activity
   * @param {Number} [requestParameters.limit] -  max number of records
   * @param {Number} [requestParameters.from] - it is 'id'. The query begin at ‘from', and the default is 0
   * @param {"PRE"|"NEXT"} [requestParameters.direction] - PRE, NEXT, default is NEXT
   * @param {String} [requestParameters.currency] - transferred currency
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getAccountsActivity(requestParameters) {
    const path = '/accounts/activity'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Transfer amount of currency from an account to another account for a user.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.currency - currency to transfer
   * @param {String} requestParameters.amount - amount to transfer
   * @param {String} requestParameters.fromAccount - account from which the currency is transferred
   * @param {String} requestParameters.toAccount - account to which the currency is transferred
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  accountsTransfer(requestParameters) {
    const path = '/accounts/transfer'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('POST', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of transfer records of a user.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.id] - get a single transfer record corresponding to the transferId
   * @param {Number} [requestParameters.limit] - a single account
   * @param {Number} [requestParameters.from] - It is 'transferId'. The query begin at ‘from', and the default is 0
   * @param {"PRE"|"NEXT"} [requestParameters.direction] - PRE, NEXT, default is NEXT
   * @param {String} [requestParameters.currency] - transferred currency
   * @param {Number} [requestParameters.startTime] - transfers before start time will not be retrieved
   * @param {Number} [requestParameters.endTime] - transfers after end time will not be retrieved
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getAccountsTransferRecords(requestParameters) {
    const path = ['/accounts/transfer', requestParameters?.id].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id', 'getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get fee rate.
   *
   * @param {Object} [requestParameters]
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getFeeInfo(requestParameters) {
    const path = '/feeinfo'
    return this.#requestAuth('GET', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of all the accounts within an Account Group for a user.
   *
   * @param {Object} [requestParameters]
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getSubaccountsInfo(requestParameters) {
    const path = '/subaccounts'
    return this.#requestAuth('GET', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get balances information by currency and account type.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.id] - a single account
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getSubaccountsBalances(requestParameters) {
    const path = ['/subaccounts', requestParameters?.id, 'balances'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id', 'getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Transfer amount of currency from an account and account type to another account and account type among the accounts in the account group.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.currency - currency to transfer
   * @param {String} requestParameters.amount - amount to transfer
   * @param {String} requestParameters.fromAccountId - external UID of the from account
   * @param {"SPOT"|"FUTURES"} requestParameters.fromAccountType - from account type
   * @param {String} requestParameters.toAccountId - external UID of the to account
   * @param {"SPOT"|"FUTURES"} requestParameters.toAccountType - to account type
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  subaccountsTransfer(requestParameters) {
    const path = '/subaccounts/transfer'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('POST', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of transfer records of a user.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.id] - get a single transfer record corresponding to the transferId
   * @param {Number} [requestParameters.limit] - max number of records
   * @param {Number} [requestParameters.from] - it is 'transferId'. The query begin at ‘from', and the default is 0
   * @param {"PRE"|"NEXT"} [requestParameters.direction] - PRE, NEXT, default is NEXT
   * @param {String} [requestParameters.currency] -  transferred currency
   * @param {String} [requestParameters.fromAccountId] - external UID of the from account
   * @param {"SPOT"|"FUTURES"} [requestParameters.fromAccountType] - from account type
   * @param {String} [requestParameters.toAccountId] - external UID of the to account
   * @param {"SPOT"|"FUTURES"} [requestParameters.toAccountType] - to account type
   * @param {Number} [requestParameters.startTime] - transfers before start time will not be retrieved
   * @param {Number} [requestParameters.endTime] - transfers after end time will not be retrieved
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getSubaccountsTransferRecords(requestParameters) {
    const path = ['/subaccounts/transfer', requestParameters?.id].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id', 'getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get deposit addresses for a user.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.currency] - for a single the currency
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getDepositAddresses(requestParameters) {
    const path = '/wallets/addresses'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get deposit and withdrawal activity history.
   *
   * @param {Object} requestParameters
   * @param {Number} requestParameters.start - records before start time will not be retrieved
   * @param {Number} requestParameters.end - records after end time will not be retrieved
   * @param {"deposits"|"withdrawals"} [requestParameters.activityType] - type of activity
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getWalletsActivityRecords(requestParameters) {
    const path = '/wallets/activity'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Create a new address for a currency.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.currency - the currency to use for the deposit address
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  createNewCurrencyAddress(requestParameters) {
    const path = '/wallets/address'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('POST', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Immediately places a withdrawal for a given currency.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.currency - currency name
   * @param {String} requestParameters.amount - withdrawal amount
   * @param {String} requestParameters.address - withdrawal address
   * @param {String} [requestParameters.paymentId] - paymentId for currencies that use a command deposit address
   * @param {String} [requestParameters.allowBorrow] - allow to transfer borrowed funds
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  withdrawCurrency(requestParameters) {
    const path = '/wallets/withdraw'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('POST', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get account margin information.
   *
   * @param {Object} [requestParameters]
   * @param {"SPOT"} [requestParameters.accountType] - account type. Currently only SPOT is supported
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getMarginAccountInfo(requestParameters) {
    const path = '/margin/accountMargin'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get borrow status of currencies.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.currency] - currency name
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getMarginBorrowStatus(requestParameters) {
    const path = '/margin/borrowStatus'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get maximum and available buy/sell amount for a given symbol.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - symbol name
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getMarginMaxSize(requestParameters) {
    const path = '/margin/maxSize'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Create an order for an account.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - symbol to trade
   * @param {"BUY"|"SELL"} requestParameters.side - BUY, SELL
   * @param {"GTC"|"IOC"|"FOK"} [requestParameters.timeInForce] - GTC, IOC, FOK
   * @param {"MARKET"|"LIMIT"|"LIMIT_MAKER"} [requestParameters.type] - MARKET, LIMIT, LIMIT_MAKER (for placing post only orders)
   * @param {"SPOT"} [requestParameters.accountType] - SPOT is the default and only supported one
   * @param {String} [requestParameters.price] - price is required for non-market orders
   * @param {String} [requestParameters.quantity] - base units for the order. Quantity is required for MARKET SELL or any LIMIT orders
   * @param {String} [requestParameters.amount] - quote units for the order. Amount is required for MARKET BUY order
   * @param {String} [requestParameters.clientOrderId] - maximum 64-character length
   * @param {Boolean} [requestParameters.allowBorrow] - allow order to be placed by borrowing funds
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  createOrder(requestParameters) {
    const path = '/orders'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('POST', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Create multiple orders via a single request.
   *
   * @param {Object} requestParameters
   * @param {Array<{
   *    symbol: String,
   *    side: "BUY"|"SELL",
   *    timeInForce: "GTC"|"IOC"|"FOK",
   *    type: "MARKET"|"LIMIT"|"LIMIT_MAKER",
   *    accountType: "SPOT",
   *    price: String,
   *    quantity: String,
   *    amount: String,
   *    clientOrderId: String,
   * }>} requestParameters.orders - array of json objects with order details
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call   *
   */
  createBatchOrders(requestParameters) {
    const path = '/orders/batch'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('POST', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Cancel an existing active order, new or partially filled, and place a new order.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - specify the existing order id. If id is a clientOrderId, prefix with cid: e.g. cid:myId-1
   * @param {String} [requestParameters.clientOrderId] - clientOrderId of the new order
   * @param {String} [requestParameters.price] - amended price
   * @param {String} [requestParameters.quantity] - amended quantity
   * @param {String} [requestParameters.amount] - amended amount (needed for MARKET buy)
   * @param {"MARKET"|"LIMIT"|"LIMIT_MAKER"} [requestParameters.type] - MARKET, LIMIT, LIMIT_MAKER (for placing post only orders)
   * @param {"GTC"|"IOC"|"FOK"} [requestParameters.timeInForce] - GTC, IOC, FOK
   * @param {Boolean} [requestParameters.allowBorrow] - allow order to be placed by borrowing funds
   * @param {Boolean} [requestParameters.proceedOnFailure] - new order should be placed if cancellation of the existing order fails
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  replaceOrder(requestParameters) {
    const path = ['/orders', requestParameters.id].filter(p => p).join('/')
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id', 'getApiCallRateInfo'])
    return this.#requestAuth('PUT', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of active orders for an account.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.symbol] -  symbol to trade
   * @param {"BUY"|"SELL"} [requestParameters.side] - BUY, SELL
   * @param {String} [requestParameters.from] - it is 'orderId'. The query begin at ‘from', and it is 0 when you first query
   * @param {"PRE"|"NEXT"} [requestParameters.direction] - PRE, NEXT
   * @param {Number} [requestParameters.limit] - max number of records to return
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getOpenOrders(requestParameters) {
    const path = '/orders'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get an order’s status.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - either orderId or clientOrderId (prefix with cid: )
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getOrderDetails(requestParameters) {
    const path = `/orders/${requestParameters.id}`
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Cancel an active order.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - order's id or its clientOrderId (prefix with cid: )
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  cancelOrder(requestParameters) {
    const path = `/orders/${requestParameters.id}`
    return this.#requestAuth('del', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Batch cancel one or many active orders in an account by IDs.
   *
   * @param {Object} requestParameters
   * @param {Array<String>} [requestParameters.orderIds] - array of order ids. Required if clientOrderIds is null or empty
   * @param {Array<String>} [requestParameters.clientOrderIds] - array of order clientOrderIds. Required if orderIds is null or empty
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  cancelBatchOrders(requestParameters) {
    const path = '/orders/cancelByIds'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('del', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Cancel all orders in an account.
   *
   * @param {Object} [requestParameters]
   * @param {Array<String>} [requestParameters.symbols] - if specified, only orders with those symbols are canceled
   * @param {Array<"SPOT">} [requestParameters.accountTypes] - SPOT is the default and only supported one
   * @required
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  cancelAllOrders(requestParameters) {
    const path = '/orders'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('del', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Set a timer that cancels all regular and smartorders after the timeout has expired.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.timeout - timer value in seconds
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  setKillSwitch(requestParameters) {
    const path = '/orders/killSwitch'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('POST', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get status of kill switch.
   *
   * @param {Object} requestParameters
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getKillSwitchStatus(requestParameters) {
    const path = '/orders/killSwitchStatus'
    return this.#requestAuth('GET', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Create a smart order for an account.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - symbol to trade
   * @param {"BUY"|"SELL"} requestParameters.side - BUY, SELL
   * @param {"GTC"|"IOC"|"FOK"} [requestParameters.timeInForce] - GTC, IOC, FOK
   * @param {"STOP"|"STOP_LIMIT"} [requestParameters.type] - STOP, STOP_LIMIT
   * @param {"SPOT"} [requestParameters.accountType] - SPOT is the default and only supported one
   * @param {String} [requestParameters.price] - price is required for non-market orders
   * @param {String} [requestParameters.stopPrice] - price at which order is triggered
   * @param {String} [requestParameters.quantity] - base units for the order
   * @param {String} [requestParameters.amount] - quote units for the order
   * @param {String} [requestParameters.clientOrderId] - maximum 64-character length
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  createSmartOrder(requestParameters) {
    const path = '/smartorders'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('POST', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Cancel an existing untriggered smart order and place a new smart order.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - specify the existing order id. If id is a clientOrderId, prefix with cid: e.g. cid:myId-1
   * @param {String} [requestParameters.clientOrderId] - clientOrderId of the new order
   * @param {String} [requestParameters.price] - amended price
   * @param {String} [requestParameters.stopPrice] - amended price at which order is triggered
   * @param {String} [requestParameters.quantity] - amended quantity
   * @param {String} [requestParameters.amount] - amended amount (needed for MARKET buy)
   * @param {"STOP"|"STOP_LIMIT"} [requestParameters.type] - amended type; STOP, STOP_LIMIT
   * @param {"GTC"|"IOC"|"FOK"} [requestParameters.timeInForce] - amended timeInForce; GTC, IOC, FOK
   * @param {Boolean} [requestParameters.proceedOnFailure] - new order should be placed if cancellation of the existing order fails
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  replaceSmartOrder(requestParameters) {
    const path = ['/smartorders', requestParameters.id].filter(p => p).join('/')
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id', 'getApiCallRateInfo'])
    return this.#requestAuth('PUT', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of (pending) smart orders for an account.
   *
   * @param {Object} [requestParameters]
   * @param {Number} [requestParameters.limit] - max number of records to return
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getSmartOpenOrders(requestParameters) {
    const path = '/smartorders'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a smart order’s status.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - smart order's id or its clientOrderId (prefix with cid: )
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getSmartOrderDetails(requestParameters) {
    const path = `/orders/${requestParameters.id}`
    return this.#requestAuth('GET', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Cancel a smart order.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - order's id or its clientOrderId (prefix with cid: )
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  cancelSmartOrder(requestParameters) {
    const path = `/smartorders/${requestParameters.id}`
    return this.#requestAuth('del', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Batch cancel one or many smart orders in an account by IDs.
   *
   * @param {Object} requestParameters
   * @param {Array<String>} [requestParameters.orderIds] - array of order ids. Required if clientOrderIds is null or empty
   * @param {Array<String>} [requestParameters.clientOrderIds] - array of order clientOrderIds. Required if orderIds is null or empty
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @required
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  cancelBatchSmartOrders(requestParameters) {
    const path = '/smartorders/cancelByIds'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('del', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Batch cancel all smart orders in an account.
   *
   * @param {Object} [requestParameters]
   * @param {Array<String>} [requestParameters.symbols] - if specified, only orders with those symbols are canceled
   * @param {Array<"SPOT">} [requestParameters.accountTypes] - SPOT is the default and only supported one
   * @required
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call 
   */
  cancelAllSmartOrders(requestParameters) {
    const path = '/smartorders'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('del', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of historical orders in an account.
   *
   * @param {Object} [requestParameters]
   * @param {"SPOT"} requestParameters.accountType - SPOT is the default and only supported one
   * @param {"MARKET"|"LIMIT","LIMIT_MAKER"} [requestParameters.type] - MARKET, LIMIT, LIMIT_MAKER
   * @param {"BUY"|"SELL"} requestParameters.side - BUY, SELL
   * @param {String} requestParameters.symbol - any supported symbol
   * @param {"Number"} [requestParameters.from] - an 'orderId'. The query begins at ‘from'
   * @param {"PRE"|"NEXT"} [requestParameters.direction] - PRE, NEXT The direction before or after ‘from'
   * @param {"String"} [requestParameters.states] - FAILED, FILLED, CANCELED, PARTIALLY_CANCELED. Multiple states can be specified and separated with comma
   * @param {"Number"} [requestParameters.limit] - max number of orders to return
   * @param {"Boolean"} [requestParameters.hideCancel] - whether canceled orders should not be retrieved
   * @param {"Number"} [requestParameters.startTime] - orders updated before startTime will not be retrieved
   * @param {"Number"} [requestParameters.endTime] - orders updated after endTime will not be retrieved
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getOrdersHistory(requestParameters) {
    const path = '/orders/history'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of historical smart orders in an account.
   *
   * @param {Object} [requestParameters]
   * @param {"SPOT"} requestParameters.accountType - SPOT is the default and only supported one
   * @param {"STOP"|"STOP_LIMIT"} [requestParameters.type] - STOP, STOP_LIMIT
   * @param {"BUY"|"SELL"} requestParameters.side - BUY, SELL
   * @param {String} requestParameters.symbol - any supported symbol
   * @param {"Number"} [requestParameters.from] - an 'smart orderId'. The query begins at ‘from'.
   * @param {"PRE"|"NEXT"} [requestParameters.direction] - PRE, NEXT The direction before or after ‘from'
   * @param {"String"} [requestParameters.states] - FAILED, FILLED, CANCELED, PARTIALLY_CANCELED. Multiple states can be specified and separated with comma
   * @param {"Number"} [requestParameters.limit] - max number of orders to return
   * @param {"Boolean"} [requestParameters.hideCancel] - whether canceled smart orders should not be retrieved
   * @param {"Number"} [requestParameters.startTime] - orders updated before startTime will not be retrieved
   * @param {"Number"} [requestParameters.endTime] - orders updated after endTime will not be retrieved
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getSmartOrdersHistory(requestParameters) {
    const path = '/smartorders/history'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of all trades for an account.
   *
   * @param {Object} [requestParameters]
   * @param {"Number"} [requestParameters.limit] - max number of orders to return
   * @param {"Number"} [requestParameters.startTime] - trades filled before startTime will not be retrieved
   * @param {"Number"} [requestParameters.endTime] - trades filled after endTime will not be retrieved
   * @param {"Number"} [requestParameters.from] - globally unique tradeid (use pageId value from response)
   * @param {"PRE"|"NEXT"} [requestParameters.direction] - PRE, NEXT The direction before or after ‘from'
   * @param {String} [requestParameters.symbols] - one or multiple symbols separated by comma
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getTradesHistory(requestParameters) {
    const path = '/trades'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('GET', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of all trades for an order specified by its orderId.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - the associated order's id (order's clientOrderId is not supported)
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>|["riPub"|"nriPub"|"riPriv"|"nriPriv",number, number]} - Poloniex response or rate and rate limit for the API call
   */
  getOrderTrades(requestParameters) {
    const path = `/orders/${requestParameters.id}/trades`
    return this.#requestAuth('GET', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Creates a new WebSocket for public channels.
   *
   * @param {Object} options
   * @param {object} [options.reconnect] - Optional parameter for reconnecting. If parameter property is missing or `null`, no reconnection will reoccur
   * @param {number} [options.reconnect.factor=1.5] - Multiplicative factor for exponential backoff strategy.
   * @param {number} [options.reconnect.initialDelay=50] - Defaults to 50 ms
   * @param {number} [options.reconnect.maxDelay=10000] - Defaults to 10000 ms
   * @param {boolean} [options.reconnect.randomizeDelay=false] - Range of randomness and must be between 0 and 1. By default, no randomisation is applied
   * @param {number} [options.timeout] - timeout in milliseconds after which the websockets reconnects when no messages are received. Defaults to no timeout.
   * @returns {ForeverWebSocket} - a WebSocket
   */
  newPublicWebSocket(options= {}) {
    const automaticOpen = options.automaticOpen === undefined || options.automaticOpen
    const reconnect = options.reconnect === undefined ? {} : options.reconnect
    const timeout = options.timeout
    const ping = options.ping || {
      interval: 30000,
      data: { event: 'ping' }
    }

    const ws = new ForeverWebSocket(Poloniex.#baseUrl.wsPublic, undefined, { automaticOpen, reconnect, timeout, ping })

    if (dbg_wsPub.enabled) {
      ws.send = function (data) {
        dbg_wsPub('send: ', data)
        ForeverWebSocket.prototype.send.call(this, data)
      }

      ws.on('open', (data) => {
        dbg_wsPub(`open`)
      })

      ws.on('message', (data) => {
        dbg_wsPub('message: ', data.toString())
      })

      ws.on('error', (data) => {
        dbg_wsPub('error: ', data.toString())
      })

      ws.on('close', (code, reason) => {
        dbg_wsPub('close: ', code, reason.toString())
      })
    }

    return ws
  }

  /**
   * Creates a new WebSocket for authenticated channels.
   *
   * @param {Object} options
   * @param {object} [options.reconnect] - Optional parameter for reconnecting. If parameter property is missing or `null`, no reconnection will reoccur
   * @param {number} [options.reconnect.factor=1.5] - Multiplicative factor for exponential backoff strategy.
   * @param {number} [options.reconnect.initialDelay=50] - Defaults to 50 ms
   * @param {number} [options.reconnect.maxDelay=10000] - Defaults to 10000 ms
   * @param {boolean} [options.reconnect.randomizeDelay=false] - Range of randomness and must be between 0 and 1. By default, no randomisation is applied
   * @param {number} [options.timeout] - timeout in milliseconds after which the websockets reconnects when no messages are received. Defaults to no timeout.
   * @returns {ForeverWebSocket} - a WebSocket
   */
  newAuthenticatedWebSocket(options = {}) {
    const automaticOpen = options.automaticOpen === undefined || options.automaticOpen
    const reconnect = options.reconnect === undefined ? {} : options.reconnect
    const timeout = options.timeout
    const ping = options.ping || {
      interval: 30000,
      data: { event: 'ping' }
    }

    const ws = new ForeverWebSocket(Poloniex.#baseUrl.wsPrivate, undefined, { automaticOpen, reconnect, timeout, ping })

    if (dbg_wsAuth.enabled) {
      ws.send = function (data) {
        dbg_wsAuth('send: ', data)
        ForeverWebSocket.prototype.send.call(this, data)
      }

      ws.on('open', (data) => {
        dbg_wsAuth(`open`)
      })

      ws.on('message', (data) => {
        dbg_wsAuth('message: ', data.toString())
      })

      ws.on('error', (data) => {
        dbg_wsAuth('error: ', data.toString())
      })

      ws.on('close', (code, reason) => {
        dbg_wsAuth('close: ', code, reason.toString())
      })
    }

    ws.on('open', () => {
      const headers = Poloniex.#getRequestHeaders('GET', '/ws', {}, null, this.#apiKey, this.#apiSecret)
      ws.send({
        event: "subscribe",
        channel: ["auth"],
        params: {
          key: headers.key,
          signTimestamp: headers.signTimestamp,
          signature: headers.signature
        }
      })
    })

    return ws
  }
}
