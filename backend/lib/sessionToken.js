const crypto = require('crypto');

const TOKEN_TTL_SECONDS = 12 * 60 * 60;

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

function signSession(user, secret, now = Date.now()) {
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  const issuedAt = Math.floor(now / 1000);
  const payload = encode(JSON.stringify({
    sub: user.id,
    role: user.role,
    telegramId: String(user.telegram_id),
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_SECONDS,
  }));
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySession(token, secret, now = Date.now()) {
  if (!token || !secret) throw new Error('Missing session');
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) throw new Error('Invalid session');

  const expected = crypto.createHmac('sha256', secret).update(payload).digest();
  const received = Buffer.from(signature, 'base64url');
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new Error('Invalid session');
  }

  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (!decoded.sub || decoded.exp <= Math.floor(now / 1000)) throw new Error('Session expired');
  return decoded;
}

module.exports = { signSession, verifySession, TOKEN_TTL_SECONDS };
