const crypto = require('crypto');
const https = require('https');

function webhookSecret(sessionSecret) {
  if (!sessionSecret) throw new Error('SESSION_SECRET is not configured');
  return crypto
    .createHash('sha256')
    .update(`telegram-webhook:${sessionSecret}`)
    .digest('hex');
}

function telegramApiRequest(botToken, method, payload) {
  return new Promise((resolve, reject) => {
    const data = Buffer.from(JSON.stringify(payload));
    const request = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${botToken}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
      timeout: 10_000,
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        let result;
        try {
          result = JSON.parse(body);
        } catch {
          return reject(new Error(`Telegram API returned HTTP ${response.statusCode}`));
        }
        if (!result.ok) return reject(new Error(result.description || 'Telegram API request failed'));
        resolve(result.result);
      });
    });

    request.on('timeout', () => request.destroy(new Error('Telegram API timeout')));
    request.on('error', reject);
    request.end(data);
  });
}

function parseStartPayload(text) {
  const match = String(text || '').trim().match(/^\/start(?:@\w+)?(?:\s+(\S+))?$/i);
  return match ? (match[1] || '') : null;
}

function buildWebAppUrl(frontendUrl, inviteToken) {
  const url = new URL(frontendUrl);
  if (inviteToken) url.searchParams.set('invite', `invite_${inviteToken}`);
  return url.toString();
}

async function configureTelegramWebhook({ botToken, sessionSecret, backendUrl }) {
  if (!botToken || !backendUrl) return false;
  const baseUrl = backendUrl.startsWith('http') ? backendUrl : `https://${backendUrl}`;
  const webhookUrl = new URL('/api/telegram/webhook', baseUrl).toString();
  await telegramApiRequest(botToken, 'setWebhook', {
    url: webhookUrl,
    secret_token: webhookSecret(sessionSecret),
    allowed_updates: ['message'],
  });
  return true;
}

module.exports = {
  buildWebAppUrl,
  configureTelegramWebhook,
  parseStartPayload,
  telegramApiRequest,
  webhookSecret,
};
