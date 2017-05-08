# poloniex-api-node ChangeLog

All notable changes to this module are documented in this file.

poloniex-api-node module adheres to [Semantic Versioning](http://semver.org/) for versioning: MAJOR.MINOR.PATCH.

1. MAJOR version increments when non-backwards compatible API changes are introduced  
2. MINOR version increments when functionality in a backwards-compatible manner are introduced  
3. PATCH version increments when backwards-compatible bug fixes are made  


## [1.1.0] - 2017-05-08
- Fix: Error handling when Poloniex returns empty response
- Changed: HTTP default request timeout from 3 seconds to 10 seconds
- Add: Optional socket timeout parameter to constructor

## [1.0.2] - 2017-04-03
- Fix: Return correct error message description for certain error codes (based on Poloniex API response)

## [1.0.1] - 2017-03-24
- Fix: Return correct error message (based on recent Poloniex change of returning detailed error code)


## [1.0.0] - 2016-10-05

First release based on [https://github.com/premasagar/poloniex.js](https://github.com/premasagar/poloniex.js "https://github.com/premasagar/poloniex.js")

Notable differences:

- parameters adhere to Poloniex native API specification (e.g. currenncyPair instead of currencyA and currencyB)
- all optional parameters supported for all API methods
- improved handling of network errors
- improved handling of Poloniex API error codes and error code description
