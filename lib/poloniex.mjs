import axios from 'axios'
import CryptoJS from 'crypto-js'

export default class Poloniex {
  // API endpoints
  #baseUrl = {
    rest: 'https://api.poloniex.com',
    wsPrivate: 'wss://ws.poloniex.com/ws/private',
    wsPublic: 'wss://ws.poloniex.com/ws/public',
  }

  #apiKey
  #apiSecret

  /**
   * Stores the rate for resource intensive and non-resource intensive public and private API calls
   *
   * @type {{riPriv: number, riPub: number, nriPub: number, nriPriv: number}}
   */
  apiCallRate = {
    riPub: 0,
    nriPub: 0,
    riPriv: 0,
    nriPriv: 0,
  }

  /**
   *
   * @param {string} [apiKey]
   * @param {string} [apiSecret]
   */
  constructor({ apiKey = '', apiSecret = '' } = {}) {
    this.#apiKey = apiKey
    this.#apiSecret = apiSecret
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

  // Make a request to a public API endpoint (no authentication is necessary)
  async #requestPub(method, path, params, body = {}) {
    const url = this.#baseUrl.rest + path
    const res = await axios({ method, url, params, data: body })
    return res.data
  }

  // Make a request to an authenticated API endpoint (API signature is required)
  async #requestAuth(method, path, params, body = {}) {
    const { headers, data } = Poloniex.#getRequestConfig(method, path, params, body, this.#apiKey, this.#apiSecret)
    const url = this.#baseUrl.rest + path
    const res = await axios({ method, url, headers, params })
      .catch((e) => {
        console.log(e)
      })
    return res.data
  }

  /**
   * Get symbols and their trade info.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.symbol] - a single symbol name
   * @returns {Promise<*>}
   */
  getSymbols(requestParameters) {
    const path = ['/markets', requestParameters?.symbol].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol'])
    return this.#requestPub('get', path, params)
  }

  /**
   * Get supported currencies.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.currency] - a single currency
   * @returns {Promise<*>}
   */
  getCurrencies(requestParameters) {
    const path = ['/currencies', requestParameters?.currency].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['currency'])
    return this.#requestPub('get', path, params)
  }

  /**
   * Get current server time.
   *
   * @returns {Promise<*>}
   */
  getTimestamp() {
    const path = '/timestamp'
    const params = {}
    return this.#requestPub('get', path, params)
  }

  /**
   * Get the latest trade price for symbols.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.symbol] - a single symbol
   * @returns {Promise<*>}
   */
  getPrices(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'price'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol'])
    return this.#requestPub('get', path, params)
  }

  /**
   * Get the latest mark price for cross margin symbols.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.symbol] - a single symbol
   * @returns {Promise<*>}
   */
  getMarkPrice(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'markPrice'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol'])
    return this.#requestPub('get', path, params)
  }

  /**
   * Get components of the mark price for a given symbol.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - a single symbol
   * @returns {Promise<*>}
   */
  getMarkPriceComponents(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'markPriceComponents'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol'])
    return this.#requestPub('get', path, params)
  }

  /**
   * Get the order book for a given symbol.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - a single symbol
   * @param {String} [requestParameters.scale] - controls aggregation by price
   * @param {Number} [requestParameters.limit] - controls aggregation by price
   * @returns {Promise<*>}
   */
  getOrderBook(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'orderBook'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['orderBook'])
    return this.#requestPub('get', path, params)
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
   * @returns {Promise<*>}
   */
  getCandles(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'candles'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['candles'])
    return this.#requestPub('get', path, params)
  }

  /**
   * Returns a list of recent trades.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - a single symbol
   * @param {Number} [requestParameters.limit] - maximum number of records returned
   * @returns {Promise<*>}
   */
  getTrades(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'trades'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['trades'])
    return this.#requestPub('get', path, params)
  }

  /**
   * Returns ticker in last 24 hours for all symbols.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.symbol] - a single symbol
   * @returns {Promise<*>}
   */
  getTicker(requestParameters) {
    const path = ['/markets', requestParameters?.symbol, 'ticker24h'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['symbol'])
    return this.#requestPub('get', path, params)
  }

  /**
   * Get collateral information for currencies.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.currency] - a single currency
   * @returns {Promise<*>}
   */
  getCollateralInfo(requestParameters) {
    const path = ['/markets', requestParameters?.currency, 'collateralInfo'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['currency'])
    return this.#requestPub('get', path, params)
  }

  /**
   * Get borrow rates information for all tiers and currencies.
   *
   * @returns {Promise<any>}
   */
  getBorrowRatesInfo() {
    const path = '/markets/borrowRatesInfo'
    const params = {}
    return this.#requestPub('get', path, params)
  }

  // Authenticated Methods

  /**
   * Get a list of all accounts of a use.
   *
   * @returns {Promise<any>}
   */
  getAccountsInfo() {
    const path = '/accounts'
    const params = {}
    return this.#requestAuth('get', path, params)
  }

  /**
   * Get a list of accounts of a user with each account’s id, type and balances.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.id] - a single account
   * @returns {Promise<any>}
   */
  getAccountsBalances(requestParameters) {
    const path = ['/accounts', requestParameters?.id, 'balances'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id'])
    return this.#requestAuth('get', path, params)
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
   * @returns {Promise<any>}
   */
  getAccountsActivity(requestParameters) {
    const path = '/accounts/activity'
    const params = requestParameters
    return this.#requestAuth('get', path, params)
  }

  /**
   * Transfer amount of currency from an account to another account for a user.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.currency - currency to transfer
   * @param {String} requestParameters.amount - amount to transfer
   * @param {String} requestParameters.fromAccount - account from which the currency is transferred
   * @param {String} requestParameters.toAccount - account to which the currency is transferred
   * @returns {Promise<any>}
   */
  accountsTransfer(requestParameters) {
    const path = '/accounts/transfer'
    const body = requestParameters
    return this.#requestAuth('post', path, {}, body)
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
   * @returns {Promise<any>}
   */
  getAccountsTransferRecords(requestParameters) {
    const path = ['/accounts/transfer', requestParameters?.id].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id'])
    return this.#requestAuth('get', path, params)
  }

  /**
   * Get fee rate.
   *
   * @returns {Promise<any>}
   */
  getFeeInfo() {
    const path = '/feeinfo'
    const params = {}
    return this.#requestAuth('get', path, params)
  }

  /**
   * Get a list of all the accounts within an Account Group for a user.
   *
   * @returns {Promise<any>}
   */
  getSubaccountsInfo() {
    const path = '/subaccounts'
    const params = {}
    return this.#requestAuth('get', path, params)
  }

  /**
   * Get balances information by currency and account type.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.id] - a single account
   * @returns {Promise<any>}
   */
  getSubaccountsBalances(requestParameters) {
    const path = ['/subaccounts', requestParameters?.id, 'balances'].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id'])
    return this.#requestAuth('get', path, params)
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
   * @returns {Promise<any>}
   */
  subaccountsTransfer(requestParameters) {
    const path = '/subaccounts/transfer'
    const body = requestParameters
    return this.#requestAuth('post', path, {}, body)
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
   * @returns {Promise<any>}
   */
  getSubaccountsTransferRecords(requestParameters) {
    const path = ['/subaccounts/transfer', requestParameters?.id].filter(p => p).join('/')
    const params = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id'])
    return this.#requestAuth('get', path, params)
  }

  /**
   * Get deposit addresses for a user.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.currency] - for a single the currency
   * @returns {Promise<any>}
   */
  getDepositAddresses(requestParameters) {
    const path = '/wallets/addresses'
    const params = requestParameters
    return this.#requestAuth('get', path, params)
  }

  /**
   * Get deposit and withdrawal activity history.
   *
   * @param {Object} requestParameters
   * @param {Number} requestParameters.start - records before start time will not be retrieved
   * @param {Number} requestParameters.end - records after end time will not be retrieved
   * @param {"deposits"|"withdrawals"} [requestParameters.activityType] - type of activity
   * @returns {Promise<any>}
   */
  getWalletsActivityRecords(requestParameters) {
    const path = '/wallets/activity'
    const params = requestParameters
    return this.#requestAuth('get', path, params)
  }

  /**
   * Create a new address for a currency.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.currency - the currency to use for the deposit address
   * @returns {Promise<any>}
   */
  createNewCurrencyAddress(requestParameters) {
    const path = '/wallets/address'
    const body = requestParameters
    return this.#requestAuth('post', path, {}, body)
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
   * @returns {Promise<any>}
   */
  withdrawCurrency(requestParameters) {
    const path = '/wallets/withdraw'
    const body = requestParameters
    return this.#requestAuth('post', path, {}, body)
  }

  /**
   * Get account margin information.
   *
   * @param {Object} requestParameters
   * @param {"SPOT"} requestParameters.accountType - account type. Currently only SPOT is supported
   * @returns {Promise<any>}
   */
  getMarginAccountInfo(requestParameters) {
    const path = '/margin/accountMargin'
    const params = requestParameters
    return this.#requestAuth('get', path, params)
  }

  /**
   * Get borrow status of currencies.
   *
   * @param {Object} [requestParameters]
   * @param {String} [requestParameters.currency] - currency name
   * @returns {Promise<any>}
   */
  getMarginBorrowStatus(requestParameters) {
    const path = '/margin/borrowStatus'
    const params = requestParameters
    return this.#requestAuth('get', path, params)
  }

  /**
   * Get maximum and available buy/sell amount for a given symbol.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.symbol - symbol name
   * @returns {Promise<any>}
   */
  getMarginMaxSize(requestParameters) {
    const path = '/margin/maxSize'
    const params = requestParameters
    return this.#requestAuth('get', path, params)
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
   * @returns {Promise<any>}
   */
  createOrder(requestParameters) {
    const path = '/orders'
    const body = requestParameters
    return this.#requestAuth('post', path, {}, body)
  }

  /**
   * Create multiple orders via a single request.
   *
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
   * >} requestParameters - array of json objects with order details
   * @returns {Promise<any>}
   */
  createBatchOrders(requestParameters) {
    const path = '/orders/batch'
    const body = requestParameters
    return this.#requestAuth('post', path, {}, body)
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
   * @returns {Promise<any>}
   */
  replaceOrder(requestParameters) {
    const path = ['/orders', requestParameters.id].filter(p => p).join('/')
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id'])
    return this.#requestAuth('put', path, {}, body)
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
   * @returns {Promise<any>}
   */
  getOpenOrders(requestParameters) {
    const path = '/orders'
    const params = requestParameters
    return this.#requestAuth('get', path, params)
  }

  /**
   * Get an order’s status.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - either orderId or clientOrderId (prefix with cid: )
   * @returns {Promise<any>}
   */
  getOrderDetails(requestParameters) {
    const path = `/orders/${requestParameters.id}`
    const params = {}
    return this.#requestAuth('get', path, params)
  }

  /**
   * Cancel an active order.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - order's id or its clientOrderId (prefix with cid: )
   * @returns {Promise<any>}
   */
  cancelOrder(requestParameters) {
    const path = `/orders/${requestParameters.id}`
    const body = {}
    return this.#requestAuth('del', path, {}, body)
  }

  /**
   * Batch cancel one or many active orders in an account by IDs.
   *
   * @param {Object} requestParameters
   * @param {Array<String>} [requestParameters.orderIds] - array of order ids. Required if clientOrderIds is null or empty
   * @param {Array<String>} [requestParameters.clientOrderIds] - array of order clientOrderIds. Required if orderIds is null or empty
   * @returns {Promise<any>}
   */
  cancelBatchOrders(requestParameters) {
    const path = '/orders/cancelByIds'
    const body = requestParameters
    return this.#requestAuth('del', path, {}, body)
  }

  /**
   * Cancel all orders in an account.
   *
   * @param {Object} [requestParameters]
   * @param {Array<String>} [requestParameters.symbols] - if specified, only orders with those symbols are canceled
   * @param {Array<"SPOT">} [requestParameters.accountTypes] - SPOT is the default and only supported one
   * @required
   * @returns {Promise<any>}
   */
  cancelBatchOrders(requestParameters) {
    const path = '/orders'
    const body = requestParameters
    return this.#requestAuth('del', path, {}, body)
  }

  /**
   * Set a timer that cancels all regular and smartorders after the timeout has expired.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.timeout - timer value in seconds
   * @returns {Promise<any>}
   */
  setKillSwitch(requestParameters) {
    const path = '/orders/killSwitch'
    const body = requestParameters
    return this.#requestAuth('post', path, {}, body)
  }

  /**
   * Get status of kill switch.
   *
   * @returns {Promise<any>}
   */
  getKillSwitchStatus() {
    const path = '/orders/killSwitchStatus'
    const params = {}
    return this.#requestAuth('get', path, params)
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
   * @returns {Promise<any>}
   */
  createSmartOrder(requestParameters) {
    const path = '/smartorders'
    const body = requestParameters
    return this.#requestAuth('post', path, {}, body)
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
   * @returns {Promise<any>}
   */
  replaceSmartOrder(requestParameters) {
    const path = ['/smartorders', requestParameters.id].filter(p => p).join('/')
    const body = Poloniex.#cloneObjectExceptKeys(requestParameters, ['id'])
    return this.#requestAuth('put', path, {}, body)
  }

  /**
   * Get a list of (pending) smart orders for an account.
   *
   * @param {Object} [requestParameters]
   * @param {Number} [requestParameters.limit] - max number of records to return
   * @returns {Promise<any>}
   */
  getSmartOpenOrders(requestParameters) {
    const path = '/smartorders'
    const params = requestParameters
    return this.#requestAuth('get', path, params)
  }

  /**
   * Get a smart order’s status.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - smart order's id or its clientOrderId (prefix with cid: )
   * @returns {Promise<any>}
   */
  getSmartOrderDetails(requestParameters) {
    const path = `/orders/${requestParameters.id}`
    const params = {}
    return this.#requestAuth('get', path, params)
  }

  /**
   * Cancel a smart order.
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - order's id or its clientOrderId (prefix with cid: )
   * @returns {Promise<any>}
   */
  cancelSmartOrder(requestParameters) {
    const path = `/smartorders/${requestParameters.id}`
    const body = {}
    return this.#requestAuth('del', path, {}, body)
  }

  /**
   * Batch cancel one or many smart orders in an account by IDs.
   *
   * @param {Object} requestParameters
   * @param {Array<String>} [requestParameters.orderIds] - array of order ids. Required if clientOrderIds is null or empty
   * @param {Array<String>} [requestParameters.clientOrderIds] - array of order clientOrderIds. Required if orderIds is null or empty
   * @required
   * @returns {Promise<any>}
   */
  cancelBatchSmartOrders(requestParameters) {
    const path = '/smartorders/cancelByIds'
    const body = requestParameters
    return this.#requestAuth('del', path, {}, body)
  }

  /**
   * Batch cancel all smart orders in an account.
   *
   * @param {Object} [requestParameters]
   * @param {Array<String>} [requestParameters.symbols] - if specified, only orders with those symbols are canceled
   * @param {Array<"SPOT">} [requestParameters.accountTypes] - SPOT is the default and only supported one
   * @required
   * @returns {Promise<any>}
   */
  cancelAllSmartOrders(requestParameters) {
    const path = '/smartorders'
    const body = requestParameters
    return this.#requestAuth('del', path, {}, body)
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
   * @returns {Promise<any>}
   */
  getOrdersHistory(requestParameters) {
    const path = '/orders/history'
    const params = requestParameters
    return this.#requestAuth('get', path, params)
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
   * @returns {Promise<any>}
   */
  getSmartOrdersHistory(requestParameters) {
    const path = '/smartorders/history'
    const params = requestParameters
    return this.#requestAuth('get', path, params)
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
   * @returns {Promise<any>}
   */
  getTradesHistory(requestParameters) {
    const path = '/trades'
    const params = requestParameters
    return this.#requestAuth('get', path, params)
  }

  /**
   * Get a list of all trades for an order specified by its orderId
   *
   * @param {Object} requestParameters
   * @param {String} requestParameters.id - the associated order's id (order's clientOrderId is not supported)
   * @returns {Promise<any>}
   */
  getOrderTrades(requestParameters) {
    const path = `/orders/${requestParameters.id}/trades`
    const params = {}
    return this.#requestAuth('get', path, params)
  }
}
