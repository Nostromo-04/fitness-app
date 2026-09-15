const crypto = require('crypto');

const ACCESS_TTL_SECONDS = 5 * 60;
const AUDIENCE = 'fitness-app-browser-access';

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function createBrowserAccessToken(privateKey, now = Date.now(), claims = {}) {
  const issuedAt = Math.floor(now / 1000);
  const payload = encode(JSON.stringify({
    aud: AUDIENCE,
    iat: issuedAt,
    exp: issuedAt + ACCESS_TTL_SECONDS,
    nonce: crypto.randomBytes(18).toString('base64url'),
    ...claims,
  }));
  const signature = crypto.sign(null, Buffer.from(payload), privateKey).toString('base64url');
  return `${payload}.${signature}`;
}

function verifyBrowserAccessToken(token, publicKey, usedNonces, now = Date.now()) {
  const [payload, signature, extra] = String(token || '').split('.');
  if (!payload || !signature || extra) throw new Error('Invalid browser access token');
  const valid = crypto.verify(null, Buffer.from(payload), publicKey, Buffer.from(signature, 'base64url'));
  if (!valid) throw new Error('Invalid browser access signature');
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  const current = Math.floor(now / 1000);
  if (decoded.aud !== AUDIENCE || !decoded.nonce || decoded.iat > current + 30 || decoded.exp <= current) {
    throw new Error('Browser access token expired');
  }
  if (decoded.exp - decoded.iat > ACCESS_TTL_SECONDS) throw new Error('Browser access token lifetime is invalid');
  if (usedNonces.has(decoded.nonce)) throw new Error('Browser access token was already used');
  usedNonces.add(decoded.nonce);
  return decoded;
}

module.exports = { createBrowserAccessToken, verifyBrowserAccessToken, ACCESS_TTL_SECONDS };

