const db = require('../config/database');
const crypto = require('crypto');

const BOT_USERNAME = 'kablaev_team_bot';

const athleteController = {
  // Тренер создаёт нового спортсмена — спортсмен сразу попадает в users
  async createAthlete(req, res) {
    let client;
    try {
      const { first_name, last_name } = req.body;
      const coach_id = req.user.id;

      if (!first_name || !coach_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Укажите имя спортсмена и coach_id',
        });
      }

      client = await db.pool.connect();
      await client.query('BEGIN');
      const athleteResult = await client.query(
        `INSERT INTO users (telegram_id, role, coach_id, first_name, last_name, phone)
         VALUES (NULL, 'athlete', $1, $2, $3, NULL)
         RETURNING id, telegram_id, role, coach_id, first_name, last_name, phone, created_at`,
        [coach_id, first_name.trim(), last_name ? last_name.trim() : null]
      );
      const newAthlete = athleteResult.rows[0];

      const inviteToken = crypto.randomBytes(32).toString('base64url');
      const inviteHash = crypto.createHash('sha256').update(inviteToken).digest('hex');
      await client.query(
        `INSERT INTO athlete_invites (token_hash, coach_id, athlete_id, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '72 hours')`,
        [inviteHash, coach_id, newAthlete.id]
      );
      await client.query('COMMIT');

      // Ссылка содержит одноразовый случайный токен, а не предсказуемый ID.
      const botLink = `https://t.me/${BOT_USERNAME}?startapp=invite_${inviteToken}`;

      res.status(201).json({
        status: 'success',
        data: {
          athlete: newAthlete,
          botLink,
        },
      });
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.error('Ошибка создания спортсмена:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    } finally {
      if (client) client.release();
    }
  },
};

module.exports = athleteController;
