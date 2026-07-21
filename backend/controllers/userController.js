const db = require('../config/database');

const userController = {
  // GET /api/users — все пользователи
  async getAllUsers(req, res) {
    try {
      const result = await db.query(
        'SELECT id, first_name, last_name, role, telegram_id, phone, coach_id FROM users ORDER BY id'
      );
      res.json({ status: 'success', data: result.rows });
    } catch (error) {
      console.error('getAllUsers error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // GET /api/users/:id — один пользователь
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const result = await db.query(
        'SELECT id, first_name, last_name, role, telegram_id, phone, coach_id FROM users WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
      }
      res.json({ status: 'success', data: result.rows[0] });
    } catch (error) {
      console.error('getUserById error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // GET /api/users/coach/:coachId/athletes
  // Возвращает всех спортсменов тренера.
  // Включает пользователей с role='admin' у которых заполнен coach_id —
  // такие пользователи тоже тренируются у этого тренера.
  async getCoachAthletes(req, res) {
    try {
      const { coachId } = req.params;
      const result = await db.query(
        `SELECT id, first_name, last_name, role, telegram_id, phone, coach_id
           FROM users
          WHERE coach_id = $1
            AND (role = 'athlete' OR role = 'admin')
          ORDER BY first_name`,
        [coachId]
      );
      res.json({ status: 'success', data: result.rows });
    } catch (error) {
      console.error('getCoachAthletes error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // PUT /api/users/:id — обновить пользователя
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { first_name, last_name, phone, role, coach_id, telegram_id } = req.body;
      const result = await db.query(
        `UPDATE users
            SET first_name  = COALESCE($1, first_name),
                last_name   = COALESCE($2, last_name),
                phone       = COALESCE($3, phone),
                role        = COALESCE($4, role),
                coach_id    = COALESCE($5, coach_id),
                telegram_id = COALESCE($6, telegram_id)
          WHERE id = $7
          RETURNING id, first_name, last_name, role, telegram_id, phone, coach_id`,
        [first_name, last_name, phone, role, coach_id, telegram_id, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
      }
      res.json({ status: 'success', data: result.rows[0] });
    } catch (error) {
      console.error('updateUser error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },
};

module.exports = userController;
