const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { signSession, verifySession } = require('../lib/sessionToken');

function makeInitData(botToken, user, now, extraParams = {}) {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(now / 1000)),
    query_id: 'test-query',
    user: JSON.stringify(user),
    ...extraParams,
  });
  const check = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}

test('accepts authentic, recent Telegram initData', () => {
  const now = Date.UTC(2026, 6, 22, 10, 0, 0);
  const initData = makeInitData('bot-token', { id: 123, first_name: 'Test' }, now);
  assert.equal(verifyTelegramInitData(initData, 'bot-token', now).user.id, 123);
});

test('includes the Telegram signature field in bot-token validation', () => {
  const now = Date.UTC(2026, 6, 22, 10, 0, 0);
  const initData = makeInitData('bot-token', { id: 123 }, now, {
    signature: 'telegram-ed25519-signature',
  });
  assert.equal(verifyTelegramInitData(initData, 'bot-token', now).user.id, 123);
});

test('returns the signed Telegram start_param for automatic invitations', () => {
  const now = Date.UTC(2026, 6, 22, 10, 0, 0);
  const initData = makeInitData('bot-token', { id: 123 }, now, {
    start_param: 'invite_secure-token-1234567890',
  });
  assert.equal(
    verifyTelegramInitData(initData, 'bot-token', now).startParam,
    'invite_secure-token-1234567890'
  );
});

test('rejects tampered Telegram initData', () => {
  const now = Date.UTC(2026, 6, 22, 10, 0, 0);
  const params = new URLSearchParams(makeInitData('bot-token', { id: 123 }, now));
  params.set('user', JSON.stringify({ id: 999 }));
  assert.throws(() => verifyTelegramInitData(params.toString(), 'bot-token', now));
});

test('rejects expired Telegram initData', () => {
  const now = Date.UTC(2026, 6, 22, 10, 0, 0);
  const old = now - 16 * 60 * 1000;
  assert.throws(() => verifyTelegramInitData(makeInitData('bot-token', { id: 123 }, old), 'bot-token', now));
});

test('signs and validates a bounded server session', () => {
  const now = Date.UTC(2026, 6, 22, 10, 0, 0);
  const token = signSession({ id: 7, role: 'athlete', telegram_id: '123' }, 'long-secret', now);
  const payload = verifySession(token, 'long-secret', now + 1000);
  assert.deepEqual({ sub: payload.sub, role: payload.role, telegramId: payload.telegramId }, {
    sub: 7,
    role: 'athlete',
    telegramId: '123',
  });
  assert.throws(() => verifySession(`${token}broken`, 'long-secret', now));
});
