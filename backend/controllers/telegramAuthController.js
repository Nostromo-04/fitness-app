const db = require('../config/database');

const telegramAuthController = {
  /**
   * GET /api/auth/telegram/:telegramId
   * Ищет пользователя по telegram_id.
   * Возвращает: { id, role, first_name, last_name, coach_id, telegram_id }
   */
  async findByTelegramId(req, res) {
    try {
      const { telegramId } = req.params;

      if (!telegramId) {
        return res.status(400).json({ status: 'error', message: 'telegramId обязателен' });
      }

      const result = await db.query(
        'SELECT id, role, first_name, last_name, coach_id, telegram_id FROM users WHERE telegram_id = $1 LIMIT 1',
        [String(telegramId)]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ status: 'not_found', message: 'Пользователь не найден' });
      }

      res.json({ status: 'success', data: result.rows[0] });
    } catch (error) {
      console.error('Ошибка поиска по telegram_id:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  /**
   * POST /api/auth/telegram/link
   * Привязывает telegram_id к уже созданному пользователю.
   * Используется при первом запуске у спортсмена, созданного тренером.
   * Body: { telegramId, userId }
   */
  async linkTelegramId(req, res) {
    try {
      const { telegramId, userId } = req.body;

      if (!telegramId || !userId) {
        return res.status(400).json({ status: 'error', message: 'telegramId и userId обязательны' });
      }

      // Проверяем, что telegram_id ещё не занят другим пользователем
      const existing = await db.query(
        'SELECT id FROM users WHERE telegram_id = $1 AND id != $2 LIMIT 1',
        [String(telegramId), userId]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ status: 'error', message: 'Этот Telegram уже привязан к другому аккаунту' });
      }

      const updated = await db.query(
        'UPDATE users SET telegram_id = $1 WHERE id = $2 RETURNING id, role, first_name, last_name, coach_id, telegram_id',
        [String(telegramId), userId]
      );

      if (updated.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
      }

      res.json({ status: 'success', data: updated.rows[0] });
    } catch (error) {
      console.error('Ошибка привязки telegram_id:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },
};

module.exports = telegramAuthController;
