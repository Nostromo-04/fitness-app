const User = require('../models/User');
const db = require('../config/database');

const BOT_USERNAME = 'kablaev_team_bot';

const athleteController = {
  // Тренер создаёт нового спортсмена — спортсмен сразу попадает в users
  async createAthlete(req, res) {
    try {
      const { first_name, last_name, coach_id } = req.body;

      if (!first_name || !coach_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Укажите имя спортсмена и coach_id',
        });
      }

      // Проверяем тренера
      const coachResult = await db.query(
        "SELECT id, first_name FROM users WHERE id = $1 AND role = 'coach'",
        [coach_id]
      );
      if (coachResult.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'Тренер не найден' });
      }

      // Создаём спортсмена (telegram_id = null, потом привяжется при первом открытии)
      const newAthlete = await User.create({
        telegram_id: null,
        role: 'athlete',
        coach_id: parseInt(coach_id),
        first_name: first_name.trim(),
        last_name: last_name ? last_name.trim() : null,
        phone: null,
      });

      // Ссылка на бота — спортсмен нажмёт Start и откроется Mini App
      const botLink = `https://t.me/${BOT_USERNAME}`;

      res.status(201).json({
        status: 'success',
        data: {
          athlete: newAthlete,
          botLink,
        },
      });
    } catch (error) {
      console.error('Ошибка создания спортсмена:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },
};

module.exports = athleteController;
