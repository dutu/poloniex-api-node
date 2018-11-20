# poloniex-api-node Changelog

All notable changes to this module are documented in this file.

poloniex-api-node module adheres to [Semantic Versioning](http://semver.org/).

## [2.0.0] - 2018-11-20
- Changed: removed `version` parameter for `openWebSocket` method. `version = 2` (WebSocket) is now the default 
- Changed: removed the push API using WAMP which is deprecated
- Changed: WebSocket channel `footer`renamed to `volume` 
- Added: new order `statusTrading` API method (REST API)
- Added: WebSocket API for account notifications channel (private account) 
- Fixed: error when subscribing between openWebSocket and `open` event

## [1.9.0] - 2018-05-05
- Added: support for custom HTTP headers 

## [1.8.2] - 2018-02-02
- Fixed: WebSocket `keepAlive` occasionally throws error 

## [1.8.1] - 2018-01-29
- Fixed: not possible to specify `paymentId`for method `withdraw`

## [1.8.0] - 2018-01-25
- Added: ability to set specific http.Agent for REST API calls and WebSocket connection (#53)

## [1.7.0] - 2018-01-09
- Changed: examples updated
- Added: ability to pass in a nonce generating function

## [1.6.5] - 2017-11-21
- Fixed: ignore unknown markets for ticker (WebSocket v2)
- Changed: use dynamic market Ids (WebSocket v2) (#34)
- Added: test for receiving 400 ticker messages

## [1.6.4] - 2017-11-20
- Fixed: STORJ currency added (#32)
- Added: allow passing `proxy` option to underlying request calls
- Added: tests for node.js 9.x
- Added: test to verify `orderBook` is first message type when subscribing to orderBook (WebSocket v2)

## [1.6.3] - 2017-10-16
- Fixed: minor documentation error
- Fixed: cannot subscribe to WebSocket (v2) before connection opens (#29)  

## [1.6.2] - 2017-09-08
- Fixed: custom string for 'User-Agent' in headers

## [1.6.0] - 2017-09-07
- Added: new WebSocket API (v2)

## [1.5.1] - 2017-09-04
- Added: WebSocket (push) API (v1)

## [1.4.0] - 2017-09-02
- Added: `limit` parameter for `returnTradeHistory` and `returnMyTradeHistory` methods
- Added: contributors to [README.md](README.md#contributors) (give credit where credit is due)  

## [1.3.1] - 2017-07-11
- Fixed: throw error when invalid parameters (#2)  

## [1.3.0] - 2017-07-02
- Added: optional `keepAlive` parameter to constructor

## [1.2.0] - 2017-06-18
- Added: promise support
- Changed: default socketTimeout changed from 10 seconds to 60 seconds

## [1.1.1] - 2017-05-08
- Fixed: error handling for certain Poloniex error responses

## [1.1.0] - 2017-05-08
- Fixed: error handling when Poloniex returns empty response
- Changed: HTTP default request timeout from 3 seconds to 10 seconds
- Added: optional socket timeout parameter to constructor

## [1.0.2] - 2017-04-03
- Fixed: return correct error message description for certain error codes (based on Poloniex API response)

## [1.0.1] - 2017-03-24
- Fixed: return correct error message (based on recent Poloniex change of returning detailed error code)


## [1.0.0] - 2016-10-05

First release based on [https://github.com/premasagar/poloniex.js](https://github.com/premasagar/poloniex.js "https://github.com/premasagar/poloniex.js")

Notable differences:

- parameters adhere to Poloniex native API specification (e.g. currenncyPair instead of currencyA and currencyB)
- all optional parameters supported for all API methods
- improved handling of network errors
- improved handling of Poloniex API error codes and error code description
