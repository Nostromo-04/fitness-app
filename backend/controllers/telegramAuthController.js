const db = require('../config/database');
const { verifyTelegramInitData } = require('../lib/telegramAuth');
const { signSession, TOKEN_TTL_SECONDS } = require('../lib/sessionToken');
const { normalizeInviteToken } = require('../lib/inviteToken');
const { consumeInvite } = require('../lib/athleteInvite');

const USER_FIELDS = 'id, role, first_name, last_name, coach_id, telegram_id';

const telegramAuthController = {
  async authenticate(req, res) {
    let client;
    try {
      const { initData, inviteToken } = req.body || {};
      const telegram = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
      const telegramId = String(telegram.user.id);
      const requestedProfileId = Number(req.body?.profileId);
      // start_param входит в подписанные Telegram initData. Читаем приглашение
      // прямо из проверенных данных, а параметр frontend оставляем fallback.
      const resolvedInviteToken = normalizeInviteToken(telegram.startParam)
        || normalizeInviteToken(inviteToken);

      // Приглашение обрабатывается до поиска существующего пользователя:
      // один Telegram ID может принадлежать и профилю тренера, и профилю спортсмена.
      if (resolvedInviteToken) {
        client = await db.pool.connect();
        await client.query('BEGIN');
        const invitedUser = await consumeInvite(client, resolvedInviteToken, telegramId);
        if (invitedUser) await client.query('COMMIT');
        else await client.query('ROLLBACK');
      }

      const result = await db.query(
        `SELECT ${USER_FIELDS} FROM users WHERE telegram_id = $1 ORDER BY id`,
        [telegramId]
      );
      const profiles = result.rows;
      if (profiles.length === 0) {
        return res.status(404).json({ status: 'not_found', message: 'Пользователь не найден' });
      }

      if (profiles.length > 1 && !Number.isInteger(requestedProfileId)) {
        return res.json({
          status: 'selection_required',
          data: { profiles, requiresSelection: true },
        });
      }

      const user = Number.isInteger(requestedProfileId)
        ? profiles.find(profile => Number(profile.id) === requestedProfileId)
        : profiles[0];
      if (!user) {
        return res.status(403).json({ status: 'error', message: 'Этот профиль не связан с вашим Telegram' });
      }

      const token = signSession(user, process.env.SESSION_SECRET);
      res.json({
        status: 'success',
        data: { user, profiles, token, expiresIn: TOKEN_TTL_SECONDS },
      });
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
