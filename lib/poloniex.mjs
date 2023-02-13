import axios from 'axios'
import CryptoJS from 'crypto-js'

export default class Poloniex {
  // API endpoints
  static #baseUrl = {
    rest: 'https://api.poloniex.com',
    wsPrivate: 'wss://ws.poloniex.com/ws/private',
    wsPublic: 'wss://ws.poloniex.com/ws/public',
  }

  #apiKey
  #apiSecret
  #apiCallTimeStamps = {}

  // API rate limits for endpoints sets
  #apiRateLimits = { riPub: 10, nriPub: 200, nriPriv: 50, riPriv: 10 }
  // API endpoints sets (for rate limits)
  #apiRateLimitsEndpointsSets = {
    // resource intensive public endpoints
    riPub: [
      "get/markets",
      "get/markets/{symbol}/trades",
      "get/markets/ticker24h",
      "get/markets/{symbol}/ticker24h",
      "get/currencies",
      "get/currencies/{currency}"
    ],
    // non-resource intensive public endpoints
    nriPub: [
      "get/markets/{symbol}",
      "get/markets/price",
      "get/markets/{symbol}/price",
      "get/markets/markPrice",
      "get/markets/{symbol}/markPrice",
      "get/markets/{symbol}/markPriceComponents",
      "get/markets/{symbol}/orderBook",
      "get/markets/{symbol}/candles",
      "get/timestamp",
      "get/markets/collateralInfo",
      "get/markets/{currency}/collateralInfo",
      "get/markets/borrowRatesInfo"
    ],
    // non-resource intensive private endpoints
    nriPriv: [
      'get/accounts',
      'get/accounts/balances',
      'get/accounts/{id}/balances',
      'post/accounts/transfer',
      'get/accounts/transfer/{id}',
      'get/subaccounts',
      'get/subaccounts/{id}/balances',
      'get/subaccounts/transfer/{id}',
      'get/margin/accountMargin',
      'get/margin/borrowStatus',
      'get/margin/maxSize',
      'post/orders',
      'get/orders/{id}',
      'delete/orders/{id}',
      'get/orders/{id}/trades',
      'post/orders/killSwitch',
      'get/orders/killSwitchStatus',
      'post/smartorders',
      'get/smartorders/{id}',
      'delete/smartorders/{id}',
    ],
    // resource intensive private endpoints
    riPriv: [
      'get/accounts/transfer',
      'get/accounts/activity',
      'get/subaccounts/balances',
      'get/subaccounts/transfer',
      'post/subaccounts/transfer',
      'get/feeinfo',
      'get/wallets/addresses',
      'get/wallets/addresses/{currency}',
      'post/wallets/address',
      'post/wallets/withdraw',
      'get/wallets/activity',
      'get/orders',
      'post/orders/batch',
      'put/orders',
      'delete/orders/cancelByIds',
      'delete/orders',
      'get/orders/history',
      'get/smartorders',
      'put/smartorders',
      'delete/smartorders/cancelByIds',
      'delete/smartorders',
      'get/smartorders/history',
      'get/trades',
    ]
  }

  /**
   *
   * @param {string} [apiKey]
   * @param {string} [apiSecret]
   */
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

    // define setters and getters which are storing timestamps in appropriate arrays
    for (const key of Object.keys(this.apiCallRate)) {
      this.#apiCallTimeStamps[key] = []
      Object.defineProperty(this.apiCallRate, key, {
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
      index++
    }

    timestampsArray.splice(0, index)
  }

  // Classifies the API call based on endpoint sets
  #classifyApiCall(method, path) {
    const endpoint = method + path
    let clas
    for (const [setName, set] of Object.entries(this.#apiRateLimitsEndpointsSets)) {
      for (let j = 0; j < set.length; j += 1)
        if (set[j].test(endpoint)) {
          clas = setName
          break
        }
    }

    return this.apiCallRate[clas]
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

  /**
   * Make a request to a public API endpoint (no authentication is necessary)
   * 
   * @private
   * @param method
   * @param path
   * @param params
   * @param body
   * @param getApiCallRateInfo
   * @returns {Promise<*>|[number, number]} - returns either Poloniex result or API call rate information
   */
  async #requestPub(method, path, params, body, getApiCallRateInfo) {
    if (getApiCallRateInfo) {
      return this.apiCallRate[this.#classifyApiCall(method, path)]
    }

    const url = Poloniex.#baseUrl.rest + path
    const res = await axios({ method, url, params, data: body })
    return res.data
  }

  // Generates signed request headers and body required for authentication.
  static #getRequestConfig(method, path, params, body, apiKey, apiSecret) {
    const timestamp = Date.now()
    const getRequestHeaders = function getRequestHeaders(method, path, params, apiKey, apiSecret, timestamp) {
      // Composes the parameters string: the timestamp parameter and the list of parameters, sorted by ASCII order and delimited by &. All parameters are URL/UTF-8 encoded (i.e. space is encoded as "%20").
      const composeParamString = function (params, timestamp) {
        const values = [`signTimestamp=${timestamp}`]
        Object.entries(params).forEach(([k, v]) => values.push(`${k}=${encodeURIComponent(v)}`))
        return values.sort().join("&")
      }
      // Generates the digital signature
      const sign = function sign(method, path, paramString, apiSecret) {
        const payload = method.toUpperCase() + "\n" + path + "\n" + paramString
        const hmacData = CryptoJS.HmacSHA256(payload, apiSecret)
        return CryptoJS.enc.Base64.stringify(hmacData)
      }

      const paramString = composeParamString(params, timestamp)
      const signature = sign(method, path, paramString, apiSecret, timestamp)
      return {
        "Content-Type": "application/json",
        "key": apiKey,
        'signatureMethod': 'HmacSHA256',
        "signature": signature,
        "signTimestamp": timestamp
      }
    }

    const getRequestBody = function getRequestBody(body = {}, timestamp) {
      if (Object.keys(body) > 0) {
        return `${JSON.stringify(body)}&signTimestamp=${timestamp}`
      } else {
        return `signTimestamp=${timestamp}`
      }
    }

    let config
    if (method === 'DELETE' || method === 'POST' || method === 'PUT') {
      config = {
        headers: getRequestHeaders(method, path, params, apiKey, apiSecret, timestamp),
        body: getRequestBody(body, timestamp)
      }
    } else {
      config =  {
        headers: getRequestHeaders(method, path, params, apiKey, apiSecret, timestamp),
      }
    }

    return config
  }

  /**
   * Make a request to an authenticated API endpoint (API signature is required)
   * 
   * @private
   * @param method
   * @param path
   * @param params
   * @param body
   * @param getApiCallRateInfo
   * @returns {Promise<*>|[number, number]} - returns either Poloniex result or API call rate information
   */
  async #requestAuth(method, path, params, body, getApiCallRateInfo) {
    if (getApiCallRateInfo) {
      return this.apiCallRate[this.#classifyApiCall(method, path)]
    }

    const { headers, data } = Poloniex.#getRequestConfig(method, path, params, body, this.#apiKey, this.#apiSecret)
    const url = Poloniex.#baseUrl.rest + path
    const res = await axios({ method, url, headers, params, data })
    return res.data
  }

  /**
   * Returns the call rate for resource-intensive and non-resource-intensive private and public API calls
   *
   * @returns {{nriPub: [number, number], riPubv: [number, number], nriPub: [number, number], riPubv: [number, number]}} - API call rate Info for each set
   * @returns {[number, number]} return.nriPub - rate and rate limit for non-resource intensive public API calls
   * @returns {[number, number]} return.riPub - rate and rate limit for resource intensive public API calls
   * @returns {[number, number]} return.nriPriv - rate and rate limit for non-resource intensive private API calls
   * @returns {[number, number]} return.riPriv - rate and rate limit for resource intensive private API calls
   */
  get apiCallRate() {
    const result = (key) => {
      return [
        () => {
          this.#removeExpiredTimestamps(key)
          return this.#apiCallTimeStamps[key].length
        },
        this.#apiRateLimits[key]
      ]
    }

    return {
      nriPub: result('nriPub'),
      riPub: result('riPub'),
      nriPriv: result('nriPriv'),
      riPriv: result('riPriv'),
    }
  }

  /**
   * Get symbols and their trade info.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.symbol] - a single symbol name
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getSymbols(requestParameters) {
    const path = ['/markets', requestParameters?.symbol].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol', 'getApiCallRateInfo'])
    return this.#requestPub('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get supported currencies.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.currency] - a single currency
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getCurrencies(requestParameters) {
    const path = ['/currencies', requestParameters?.currency].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['currency', 'getApiCallRateInfo'])
    return this.#requestPub('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get current server time.
   *
   * @param {Object} [requestParameters]
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getTimestamp(requestParameters) {
    const path = '/timestamp'
    return this.#requestPub('get', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get the latest trade price for symbols.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.symbol] - a single symbol
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getPrices(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'price'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol', 'getApiCallRateInfo'])
    return this.#requestPub('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get the latest mark price for cross margin symbols.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.symbol] - a single symbol
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getMarkPrice(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'markPrice'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol', 'getApiCallRateInfo'])
    return this.#requestPub('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get components of the mark price for a given symbol.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - a single symbol
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getMarkPriceComponents(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'markPriceComponents'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol', 'getApiCallRateInfo'])
    return this.#requestPub('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get the order book for a given symbol.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - a single symbol
   * @param {String} [requestParameters.scale] - controls aggregation by price
   * @param {Number} [requestParameters.limit] - controls aggregation by price
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getOrderBook(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'orderBook'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['orderBook', 'getApiCallRateInfo'])
    return this.#requestPub('get', path, params, {}, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getCandles(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'candles'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['candles', 'getApiCallRateInfo'])
    return this.#requestPub('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Returns a list of recent trades.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - a single symbol
   * @param {Number} [requestParameters.limit] - maximum number of records returned
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getTrades(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'trades'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['trades', 'getApiCallRateInfo'])
    return this.#requestPub('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Returns ticker in last 24 hours for all symbols.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.symbol] - a single symbol
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getTicker(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'ticker24h'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol', 'getApiCallRateInfo'])
    return this.#requestPub('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get collateral information for currencies.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.currency] - a single currency
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getCollateralInfo(requestParameters) {
    const path = ['/markets', requestParameters?.currency, 'collateralInfo'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['currency', 'getApiCallRateInfo'])
    return this.#requestPub('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get borrow rates information for all tiers and currencies.
   *
   * @param {Object} [requestParameters]
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getBorrowRatesInfo(requestParameters) {
    const path = '/markets/borrowRatesInfo'
    return this.#requestPub('get', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  // Authenticated Methods

  /**
   * Get a list of all accounts of a use.
   *
   * @param {Object} [requestParameters]
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getAccountsInfo(requestParameters) {
    const path = '/accounts'
    return this.#requestAuth('get', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of accounts of a user with each account’s id, type and balances.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.id] - a single account
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getAccountsBalances(requestParameters) {
    const path = ['/accounts', requestParameters?.id, 'balances'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id', 'getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getAccountsActivity(requestParameters) {
    const path = '/accounts/activity'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  accountsTransfer(requestParameters) {
    const path = '/accounts/transfer'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('post', path, {}, body, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getAccountsTransferRecords(requestParameters) {
    const path = ['/accounts/transfer', requestParameters?.id].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id', 'getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get fee rate.
   *
   * @param {Object} [requestParameters]
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getFeeInfo(requestParameters) {
    const path = '/feeinfo'
    return this.#requestAuth('get', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of all the accounts within an Account Group for a user.
   *
   * @param {Object} [requestParameters]
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getSubaccountsInfo(requestParameters) {
    const path = '/subaccounts'
    return this.#requestAuth('get', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get balances information by currency and account type.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.id] - a single account
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getSubaccountsBalances(requestParameters) {
    const path = ['/subaccounts', requestParameters?.id, 'balances'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id', 'getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  subaccountsTransfer(requestParameters) {
    const path = '/subaccounts/transfer'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('post', path, {}, body, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getSubaccountsTransferRecords(requestParameters) {
    const path = ['/subaccounts/transfer', requestParameters?.id].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id', 'getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get deposit addresses for a user.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.currency] - for a single the currency
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getDepositAddresses(requestParameters) {
    const path = '/wallets/addresses'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get deposit and withdrawal activity history.
   *
   * @param {Object} requestParameters
   * @param {Number} requestParameters.start - records before start time will not be retrieved
   * @param {Number} requestParameters.end - records after end time will not be retrieved
   * @param {"deposits"|"withdrawals"} [requestParameters.activityType] - type of activity
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getWalletsActivityRecords(requestParameters) {
    const path = '/wallets/activity'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Create a new address for a currency.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.currency - the currency to use for the deposit address
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  createNewCurrencyAddress(requestParameters) {
    const path = '/wallets/address'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('post', path, {}, body, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  withdrawCurrency(requestParameters) {
    const path = '/wallets/withdraw'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('post', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get account margin information.
   *
   * @param {Object} requestParameters
   * @param {"SPOT"} requestParameters.accountType - account type. Currently only SPOT is supported
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getMarginAccountInfo(requestParameters) {
    const path = '/margin/accountMargin'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get borrow status of currencies.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.currency] - currency name
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getMarginBorrowStatus(requestParameters) {
    const path = '/margin/borrowStatus'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get maximum and available buy/sell amount for a given symbol.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - symbol name
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getMarginMaxSize(requestParameters) {
    const path = '/margin/maxSize'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  createOrder(requestParameters) {
    const path = '/orders'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('post', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Create multiple orders via a single request.
   *
   * @param {Object} requestParameters
   * @param {Array<
   *  @param {String} requestParameters.symbol - symbol to trade
   *  @param {"BUY"|"SELL"} requestParameters.side - BUY, SELL
   *  @param {"GTC"|"IOC"|"FOK"} [requestParameters.timeInForce] - GTC, IOC, FOK
   *  @param {"MARKET"|"LIMIT"|"LIMIT_MAKER"} [requestParameters.type] - MARKET, LIMIT, LIMIT_MAKER (for placing post only orders)
   *  @param {"SPOT"} [requestParameters.accountType] - SPOT is the default and only supported one
   *  @param {String} [requestParameters.price] - price is required for non-market orders
   *  @param {String} [requestParameters.quantity] - base units for the order. Quantity is required for MARKET SELL or any LIMIT orders
   *  @param {String} [requestParameters.amount] - quote units for the order. Amount is required for MARKET BUY order
   *  @param {String} [requestParameters.clientOrderId] - maximum 64-character length
   * >} requestParameters.orders - array of json objects with order details
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  createBatchOrders(requestParameters) {
    const path = '/orders/batch'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('post', path, {}, body, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  replaceOrder(requestParameters) {
    const path = ['/orders', requestParameters.id].filter(p => p).join('/')
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id', 'getApiCallRateInfo'])
    return this.#requestAuth('put', path, {}, body, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getOpenOrders(requestParameters) {
    const path = '/orders'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get an order’s status.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - either orderId or clientOrderId (prefix with cid: )
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getOrderDetails(requestParameters) {
    const path = `/orders/${requestParameters.id}`
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Cancel an active order.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - order's id or its clientOrderId (prefix with cid: )
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  setKillSwitch(requestParameters) {
    const path = '/orders/killSwitch'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('post', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get status of kill switch.
   *
   * @param {Object} requestParameters
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getKillSwitchStatus(requestParameters) {
    const path = '/orders/killSwitchStatus'
    return this.#requestAuth('get', path, {}, {}, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  createSmartOrder(requestParameters) {
    const path = '/smartorders'
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('post', path, {}, body, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  replaceSmartOrder(requestParameters) {
    const path = ['/smartorders', requestParameters.id].filter(p => p).join('/')
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id', 'getApiCallRateInfo'])
    return this.#requestAuth('put', path, {}, body, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of (pending) smart orders for an account.
   *
   * @param {Object} [requestParameters]
   * @param {Number} [requestParameters.limit] - max number of records to return
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getSmartOpenOrders(requestParameters) {
    const path = '/smartorders'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a smart order’s status.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - smart order's id or its clientOrderId (prefix with cid: )
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getSmartOrderDetails(requestParameters) {
    const path = `/orders/${requestParameters.id}`
    return this.#requestAuth('get', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Cancel a smart order.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - order's id or its clientOrderId (prefix with cid: )
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getOrdersHistory(requestParameters) {
    const path = '/orders/history'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getSmartOrdersHistory(requestParameters) {
    const path = '/smartorders/history'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
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
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getTradesHistory(requestParameters) {
    const path = '/trades'
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['getApiCallRateInfo'])
    return this.#requestAuth('get', path, params, {}, requestParameters?.getApiCallRateInfo)
  }

  /**
   * Get a list of all trades for an order specified by its orderId
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - the associated order's id (order's clientOrderId is not supported)
   * @param {Boolean} [requestParameters.getApiCallRateInfo=false] - if api call rate info should be returned, instead of executing the API call
   * @returns {Promise<*>} - promise that resolves to Poloniex response|
   * @returns {[number, number]} - rate and rate limit for the API call (when parameter getApiCallRateInfo=false is provided)
   */
  getOrderTrades(requestParameters) {
    const path = `/orders/${requestParameters.id}/trades`
    return this.#requestAuth('get', path, {}, {}, requestParameters?.getApiCallRateInfo)
  }
}
