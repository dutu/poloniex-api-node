const { expect } = require('chai');
const packageJSON = require('../package.json');

describe('package.json', () => {
  it('should have the correct "main" entry for CommonJS', () => {
    expect(packageJSON.main).to.equal('dist/cjs/poloniex.cjs');
  });

  it('should have the correct "module" entry for ESM', () => {
    expect(packageJSON.module).to.equal('./lib/poloniex.mjs');
  });
});
