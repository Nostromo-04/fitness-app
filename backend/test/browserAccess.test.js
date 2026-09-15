const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { createBrowserAccessToken, verifyBrowserAccessToken } = require('../lib/browserAccess');

test('accepts a short-lived signed browser access token only once', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const used = new Set();
  const token = createBrowserAccessToken(privateKey, 1_000_000);
  assert.equal(verifyBrowserAccessToken(token, publicKey, used, 1_001_000).aud, 'fitness-app-browser-access');
  assert.throws(() => verifyBrowserAccessToken(token, publicKey, used, 1_001_000), /already used/);
});

test('rejects tampered and expired browser access tokens', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const token = createBrowserAccessToken(privateKey, 1_000_000);
  assert.throws(() => verifyBrowserAccessToken(`${token}x`, publicKey, new Set(), 1_001_000), /signature/);
  assert.throws(() => verifyBrowserAccessToken(token, publicKey, new Set(), 1_400_000), /expired/);
});
test('preserves a signed athlete identity claim', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const token = createBrowserAccessToken(privateKey, 1_000_000, {
    athleteFirstName: 'Алексей',
    athleteLastName: 'Федюков',
  });
  const payload = verifyBrowserAccessToken(token, publicKey, new Set(), 1_001_000);
  assert.equal(payload.athleteFirstName, 'Алексей');
  assert.equal(payload.athleteLastName, 'Федюков');
});
