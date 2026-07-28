const db = require('../config/database');
const crypto = require('crypto');

const BOT_USERNAME = 'kablaev_team_bot';

const coachController = {
  /**
   * POST /api/coaches
   * Администратор создаёт нового тренера.
   * Body: { first_name, last_name }
   */
  async createCoach(req, res) {
    let client;
    try {
      const { first_name, last_name } = req.body;

      if (!first_name?.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Укажите имя тренера',
        });
      }

      client = await db.pool.connect();
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO users (role, first_name, last_name)
         VALUES ('coach', $1, $2)
         RETURNING id, telegram_id, role, first_name, last_name`,
        [first_name.trim(), last_name ? last_name.trim() : null]
      );

      const coach = result.rows[0];
      const inviteToken = crypto.randomBytes(32).toString('base64url');
      const inviteHash = crypto.createHash('sha256').update(inviteToken).digest('hex');
      await client.query(
        `INSERT INTO coach_invites (token_hash, coach_id, created_by_admin_id, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '72 hours')`,
        [inviteHash, coach.id, req.user.id]
      );
      await client.query('COMMIT');

      // Ссылка сначала открывает чат бота. После команды Start бот показывает
      // кнопку Mini App с тем же защищённым одноразовым приглашением.
      const botLink = `https://t.me/${BOT_USERNAME}?start=invite_${inviteToken}`;

      res.status(201).json({
        status: 'success',
        data: {
          coach,
          botLink,
        },
      });
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.error('Ошибка создания тренера:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    } finally {
      if (client) client.release();
    }
  },
};

module.exports = coachController;
