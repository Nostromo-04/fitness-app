const User = require('../models/User');
const db = require('../config/database');

// Хранилище инвайт-токенов в памяти (TTL 72 часа)
// Для продакшна можно перенести в Redis или отдельную таблицу БД
const inviteStore = new Map();

const BOT_USERNAME = 'kablaev_team_bot';
// FRONTEND_URL нужен как fallback — если ссылка открыта в браузере, не в Telegram
const FRONTEND_URL = (process.env.FRONTEND_URL || 'https://fitness-app-bay-five.vercel.app').replace(/\/$/, '');
const INVITE_TTL_MS = 72 * 60 * 60 * 1000; // 72 часа

const inviteController = {
  // Создать инвайт-ссылку для тренера
  async createInvite(req, res) {
    try {
      const { coachId } = req.params;

      // Проверяем, что тренер существует
      const coachQuery = "SELECT id, first_name, last_name FROM users WHERE id = $1 AND role = 'coach'";
      const coachResult = await db.query(coachQuery, [coachId]);

      if (coachResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Тренер не найден',
        });
      }

      // Генерируем токен
      const token = `coach_${coachId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Сохраняем с TTL
      inviteStore.set(token, {
        coachId: parseInt(coachId),
        createdAt: Date.now(),
        expiresAt: Date.now() + INVITE_TTL_MS,
      });

      // Telegram-ссылка: открывает Mini App напрямую, токен приходит через initDataUnsafe.start_param
      const telegramLink = `https://t.me/${BOT_USERNAME}?startapp=${token}`;
      // Web-ссылка: fallback если открывают в браузере, токен читается через URLSearchParams
      const webLink = `${FRONTEND_URL}/invite?token=${token}`;

      res.json({
        status: 'success',
        data: {
          inviteLink: telegramLink,
          webLink,
          token,
          expiresIn: '72 часа',
        },
      });
    } catch (error) {
      console.error('Ошибка создания инвайта:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // Проверить токен (без регистрации — для показа имени тренера на форме)
  async checkInvite(req, res) {
    try {
      const { token } = req.params;
      const invite = inviteStore.get(token);

      if (!invite) {
        return res.status(404).json({ status: 'error', message: 'Ссылка недействительна' });
      }

      if (Date.now() > invite.expiresAt) {
        inviteStore.delete(token);
        return res.status(410).json({ status: 'error', message: 'Ссылка устарела' });
      }

      // Получаем имя тренера
      const coachQuery = 'SELECT first_name, last_name FROM users WHERE id = $1';
      const coachResult = await db.query(coachQuery, [invite.coachId]);
      const coach = coachResult.rows[0];

      res.json({
        status: 'success',
        data: {
          coachId: invite.coachId,
          coachName: coach ? `${coach.first_name} ${coach.last_name || ''}`.trim() : 'Тренер',
        },
      });
    } catch (error) {
      console.error('Ошибка проверки инвайта:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // Зарегистрировать спортсмена по инвайту
  async registerByInvite(req, res) {
    try {
      const { token, first_name, last_name, telegram_id } = req.body;

      if (!token || !first_name) {
        return res.status(400).json({ status: 'error', message: 'Укажите имя и токен' });
      }

      const invite = inviteStore.get(token);

      if (!invite) {
        return res.status(404).json({ status: 'error', message: 'Ссылка недействительна' });
      }

      if (Date.now() > invite.expiresAt) {
        inviteStore.delete(token);
        return res.status(410).json({ status: 'error', message: 'Ссылка устарела' });
      }

      // Если telegram_id уже есть — возвращаем существующего пользователя
      if (telegram_id) {
        const existing = await User.findByTelegramId(telegram_id);
        if (existing) {
          return res.status(200).json({ status: 'success', data: existing });
        }
      }

      // Создаём нового спортсмена
      const newUser = await User.create({
        telegram_id: telegram_id || null,
        role: 'athlete',
        coach_id: invite.coachId,
        first_name: first_name.trim(),
        last_name: last_name ? last_name.trim() : null,
        phone: null,
      });

      // Токен одноразовый — удаляем после регистрации
      inviteStore.delete(token);

      res.status(201).json({ status: 'success', data: newUser });
    } catch (error) {
      console.error('Ошибка регистрации по инвайту:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },
};

module.exports = inviteController;
