poloniex-api-node
=======
[![Build Status](https://travis-ci.org/dutu/cryptox.svg)](https://travis-ci.org/dutu/cryptox/) ![Dependencies Status](https://david-dm.org/dutu/cryptox.svg)


**poloniex-api-node** is a node.js wrapper for REST API for Poloniex exchange.

See full documentation at [https://poloniex.com/support/api/](https://poloniex.com/support/api/)


# Install

    npm install poloniex-api-node

# Use

```js
var Poloniex = require('poloniex-api-node');
var poloniex = new Poloniex('your_key', 'your_secret');
	
poloniex.returnTicker(function (err, ticket) {
    if (!err)
	    console.log(ticker);
});
```

# ChangeLog

> cryptox module adheres to [Semantic Versioning] (http://semver.org/) for versioning: MAJOR.MINOR.PATCH.  
> 1. MAJOR version increments when non-backwards compatible API changes are introduced  
> 2. MINOR version increments when functionality in a backwards-compatible manner are introduced  
> 3. PATCH version increments when backwards-compatible bug fixes are made  


See detailed [ChangeLog](CHANGELOG.md)

# License

[MIT](LICENSE)