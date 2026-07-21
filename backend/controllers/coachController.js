const db = require('../config/database');

const BOT_USERNAME = 'kablaev_team_bot';

const coachController = {
  /**
   * POST /api/coaches
   * Администратор создаёт нового тренера.
   * Body: { first_name, last_name }
   */
  async createCoach(req, res) {
    try {
      const { first_name, last_name } = req.body;

      if (!first_name) {
        return res.status(400).json({
          status: 'error',
          message: 'Укажите имя тренера',
        });
      }

      const result = await db.query(
        `INSERT INTO users (role, first_name, last_name)
         VALUES ('coach', $1, $2)
         RETURNING id, role, first_name, last_name`,
        [first_name.trim(), last_name ? last_name.trim() : null]
      );

      const coach = result.rows[0];
      const botLink = `https://t.me/${BOT_USERNAME}?startapp=user_${coach.id}`;

      res.status(201).json({
        status: 'success',
        data: {
          coach,
          botLink,
        },
      });
    } catch (error) {
      console.error('Ошибка создания тренера:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },
};

module.exports = coachController;
