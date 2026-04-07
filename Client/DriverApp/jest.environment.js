const NodeEnvironment = require('jest-environment-node').TestEnvironment;

class CustomEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    
    // Mock localStorage
    this.global.localStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    
    // Mock fetch if needed
    if (!this.global.fetch) {
      this.global.fetch = jest.fn();
    }
  }
}

module.exports = CustomEnvironment;
