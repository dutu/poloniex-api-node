# poloniex-api-node Changelog

All notable changes to this module are documented in this file.

poloniex-api-node module adheres to [Semantic Versioning](http://semver.org/).

## [1.3.1] - 2017-07-11
- Fixed: throw error when invalid parameters (#2)  

## [1.3.0] - 2017-07-02
- Added: Optional `keepAlive` parameter to constructor 

## [1.2.0] - 2017-06-18
- Added: Promise support
- Changed: default socketTimeout changed from 10 seconds to 60 seconds 

## [1.1.1] - 2017-05-08
- Fixed: Error handling for certain Poloniex error responses

## [1.1.0] - 2017-05-08
- Fixed: Error handling when Poloniex returns empty response
- Changed: HTTP default request timeout from 3 seconds to 10 seconds
- Added: Optional socket timeout parameter to constructor

## [1.0.2] - 2017-04-03
- Fixed: Return correct error message description for certain error codes (based on Poloniex API response)

## [1.0.1] - 2017-03-24
- Fixed: Return correct error message (based on recent Poloniex change of returning detailed error code)


## [1.0.0] - 2016-10-05

First release based on [https://github.com/premasagar/poloniex.js](https://github.com/premasagar/poloniex.js "https://github.com/premasagar/poloniex.js")

Notable differences:

- parameters adhere to Poloniex native API specification (e.g. currenncyPair instead of currencyA and currencyB)
- all optional parameters supported for all API methods
- improved handling of network errors
- improved handling of Poloniex API error codes and error code description
