const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { signSession, verifySession } = require('../lib/sessionToken');
const { normalizeInviteToken } = require('../lib/inviteToken');
const { consumeInvite, tokenHash } = require('../lib/athleteInvite');
const { buildWebAppUrl, parseStartPayload, webhookSecret } = require('../lib/telegramBot');

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

test('normalizes an invite token from Telegram start_param', () => {
  assert.equal(
    normalizeInviteToken('invite_secure-token-1234567890'),
    'secure-token-1234567890'
  );
});

test('normalizes an invite token from a complete Telegram link', () => {
  assert.equal(
    normalizeInviteToken('https://t.me/kablaev_team_bot?startapp=invite_secure-token-1234567890'),
    'secure-token-1234567890'
  );
});

test('normalizes an invite token from a bot /start link', () => {
  assert.equal(
    normalizeInviteToken('https://t.me/kablaev_team_bot?start=invite_secure-token-1234567890'),
    'secure-token-1234567890'
  );
});

test('parses Telegram /start invitation payloads', () => {
  assert.equal(parseStartPayload('/start invite_secure-token-1234567890'), 'invite_secure-token-1234567890');
  assert.equal(parseStartPayload('/start@kablaev_team_bot invite_secure-token-1234567890'), 'invite_secure-token-1234567890');
  assert.equal(parseStartPayload('/other'), null);
});

test('builds a Web App URL that carries the invitation', () => {
  assert.equal(
    buildWebAppUrl('https://fitness.example/app', 'secure-token-1234567890'),
    'https://fitness.example/app?invite=invite_secure-token-1234567890'
  );
});

test('derives a stable Telegram webhook secret without exposing the session secret', () => {
  const secret = webhookSecret('private-session-secret');
  assert.match(secret, /^[a-f0-9]{64}$/);
  assert.equal(secret.includes('private-session-secret'), false);
});

test('rejects an empty or numeric athlete ID as an invite token', () => {
  assert.equal(normalizeInviteToken(''), null);
  assert.equal(normalizeInviteToken('123'), null);
});

test('consumes an invite and links Telegram without requiring users.updated_at', async () => {
  const calls = [];
  const athlete = {
    id: 42,
    role: 'athlete',
    first_name: 'New',
    last_name: 'Athlete',
    coach_id: 7,
    telegram_id: '555',
  };
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.includes('FROM athlete_invites')) return { rows: [{ id: 9, athlete_id: 42 }] };
      if (sql.startsWith('UPDATE users')) return { rows: [athlete] };
      if (sql.startsWith('UPDATE athlete_invites')) return { rows: [] };
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  assert.deepEqual(await consumeInvite(client, 'secure-token-1234567890', '555'), athlete);
  assert.equal(calls[0].values[0], tokenHash('secure-token-1234567890'));
  assert.equal(calls[1].sql.includes('updated_at'), false);
  assert.deepEqual(calls[1].values, ['555', 42]);
  assert.deepEqual(calls[2].values, [9]);
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
