// Mock the Chrome extension API before any source files are loaded
globalThis.chrome = {
  storage: {
    sync: {
      get: (keys, callback) => callback({}),
    },
  },
};

// jsdom does not implement innerText — polyfill via textContent
// (functionally equivalent for the plain-text spans this extension operates on)
if (!('innerText' in HTMLElement.prototype) || typeof HTMLElement.prototype.innerText === 'undefined') {
  Object.defineProperty(HTMLElement.prototype, 'innerText', {
    get() { return this.textContent; },
    set(v) { this.textContent = v; },
  });
}

// Bridge constants.js globals into Node's scope
const { DEFAULT_JIRA_TENANT_NAME } = require('../src/constants.js');
globalThis.DEFAULT_JIRA_TENANT_NAME = DEFAULT_JIRA_TENANT_NAME;
