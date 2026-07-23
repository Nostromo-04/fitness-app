const crypto = require('crypto');

const MAX_INIT_DATA_AGE_SECONDS = 15 * 60;

function timingSafeEqualHex(left, right) {
  if (!/^[a-f0-9]{64}$/i.test(left || '') || !/^[a-f0-9]{64}$/i.test(right || '')) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function verifyTelegramInitData(initData, botToken, now = Date.now()) {
  if (!initData || !botToken) throw new Error('Telegram authentication is not configured');

  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (!timingSafeEqualHex(receivedHash, expectedHash)) throw new Error('Invalid Telegram signature');

  const authDate = Number(params.get('auth_date'));
  const ageSeconds = Math.floor(now / 1000) - authDate;
  if (!Number.isFinite(authDate) || ageSeconds < -30 || ageSeconds > MAX_INIT_DATA_AGE_SECONDS) {
    throw new Error('Telegram authentication has expired');
  }

  let user;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    throw new Error('Invalid Telegram user data');
  }
  if (!user?.id) throw new Error('Telegram user is missing');

  return {
    user,
    queryId: params.get('query_id'),
    startParam: params.get('start_param') || '',
    authDate,
  };
}

module.exports = { verifyTelegramInitData };
