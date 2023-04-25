const { expect } = require('chai')
const { join } = require('path');
const packageJSON = require('../package.json')

describe('package.json', () => {
  it('should have the correct "exports" entry for ESM', async () => {
    const modulePath = packageJSON.exports['.'].import
    const filePath = join(process.cwd(), modulePath);
    const importedModule = await import(filePath)
    expect(importedModule.default).to.be.a('function')
  })

  it('should have the correct "module" entry for ESM', async () => {
    expect(packageJSON.module).to.equal(packageJSON.exports['.'].import)
  })

  it('should have the correct "exports" entry for CommonJS', () => {
    const modulePath = packageJSON.exports['.'].require
    const filePath = join(process.cwd(), modulePath)
    const requiredModule = require(filePath)
    expect(requiredModule).to.be.an('function')
  });

  it('should have the correct "main" entry for CommonJS', () => {
    expect(packageJSON.main).to.equal(packageJSON.exports['.'].require)
  })
})
