/* global globalThis */

// jest-expo / expo winter runtime expects FormData before preset setup runs
if (typeof globalThis.FormData === 'undefined') {
  globalThis.FormData = class FormData {
    constructor() {
      this._parts = [];
    }
    append(name, value, filename) {
      this._parts.push([name, value, filename]);
    }
    get(name) {
      const found = this._parts.find(p => p[0] === name);
      return found ? found[1] : null;
    }
  };
}
