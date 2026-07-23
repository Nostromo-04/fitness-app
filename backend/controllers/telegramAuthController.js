const crypto = require('crypto');
const db = require('../config/database');
const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { signSession, TOKEN_TTL_SECONDS } = require('../lib/sessionToken');

const USER_FIELDS = 'id, role, first_name, last_name, coach_id, telegram_id';

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function inviteTokenFromStartParam(startParam) {
  const match = String(startParam || '').match(/^invite_([A-Za-z0-9_-]{20,})$/);
  return match?.[1] || null;
}

async function consumeInvite(client, rawToken, telegramId) {
  const result = await client.query(
    `SELECT i.id, i.athlete_id
     FROM athlete_invites i
     WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.expires_at > NOW()
     FOR UPDATE`,
    [tokenHash(rawToken)]
  );
  const invite = result.rows[0];
  if (!invite) return null;

  const updated = await client.query(
    `UPDATE users SET telegram_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $2 AND role = 'athlete' AND telegram_id IS NULL
     RETURNING ${USER_FIELDS}`,
    [String(telegramId), invite.athlete_id]
  );
  if (!updated.rows[0]) return null;

  await client.query('UPDATE athlete_invites SET used_at = NOW() WHERE id = $1', [invite.id]);
  return updated.rows[0];
}

const telegramAuthController = {
  async authenticate(req, res) {
    let client;
    try {
      const { initData, inviteToken } = req.body || {};
      const telegram = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
      const telegramId = String(telegram.user.id);
      // start_param входит в подписанные Telegram initData. Читаем приглашение
      // прямо из проверенных данных, а параметр frontend оставляем fallback.
      const resolvedInviteToken = inviteTokenFromStartParam(telegram.startParam)
        || (String(inviteToken || '').match(/^[A-Za-z0-9_-]{20,}$/)?.[0] ?? null);

      let result = await db.query(`SELECT ${USER_FIELDS} FROM users WHERE telegram_id = $1 LIMIT 1`, [telegramId]);
      let user = result.rows[0];

      if (!user && resolvedInviteToken) {
        client = await db.pool.connect();
        await client.query('BEGIN');
        user = await consumeInvite(client, resolvedInviteToken, telegramId);
        if (user) await client.query('COMMIT');
        else await client.query('ROLLBACK');
      }

      if (!user) return res.status(404).json({ status: 'not_found', message: 'Пользователь не найден' });

      const token = signSession(user, process.env.SESSION_SECRET);
      res.json({ status: 'success', data: { user, token, expiresIn: TOKEN_TTL_SECONDS } });
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.error('Ошибка Telegram-авторизации:', error.message);
      res.status(401).json({ status: 'error', message: 'Не удалось подтвердить данные Telegram' });
    } finally {
      if (client) client.release();
    }
  },

  async me(req, res) {
    res.json({ status: 'success', data: req.user });
  },

  deprecated(_req, res) {
    res.status(410).json({
      status: 'error',
      message: 'Небезопасный способ входа отключён. Обновите приложение.',
    });
  },
};

module.exports = telegramAuthController;
