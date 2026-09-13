const test = require('node:test');
const assert = require('node:assert/strict');
const { devAuthAllowed } = require('../lib/devAuth');

test('allows explicitly enabled local development auth', () => {
  assert.equal(devAuthAllowed({ nodeEnv: 'development', enabled: 'true', hostname: 'localhost' }), true);
});
test('never allows development auth in production', () => {
  assert.equal(devAuthAllowed({ nodeEnv: 'production', enabled: 'true', hostname: 'localhost' }), false);
});
test('rejects non-local hosts and disabled mode', () => {
  assert.equal(devAuthAllowed({ nodeEnv: 'development', enabled: 'false', hostname: 'localhost' }), false);
  assert.equal(devAuthAllowed({ nodeEnv: 'development', enabled: 'true', hostname: 'example.com' }), false);
});
