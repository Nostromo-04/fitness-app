const db = require('../config/database');

class User {
  // Создание нового пользователя
  static async create(userData) {
    const { telegram_id, role, coach_id, first_name, last_name, phone } = userData;
    
    const query = `
      INSERT INTO users (telegram_id, role, coach_id, first_name, last_name, phone)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, telegram_id, role, coach_id, first_name, last_name, phone, created_at
    `;
    
    const values = [telegram_id, role, coach_id || null, first_name, last_name, phone];
    
    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Поиск пользователя по telegram_id
  static async findByTelegramId(telegramId) {
    const query = 'SELECT * FROM users WHERE telegram_id = $1';
    const result = await db.query(query, [telegramId]);
    return result.rows[0];
  }

  // Получение всех спортсменов тренера
  static async getAthletesByCoach(coachId) {
    const query = `
      SELECT id, telegram_id, first_name, last_name, phone, created_at 
      FROM users 
      WHERE coach_id = $1 AND role = 'athlete'
      ORDER BY first_name
    `;
    const result = await db.query(query, [coachId]);
    return result.rows;
  }

  // Обновление данных пользователя
  static async update(id, updateData) {
    const { first_name, last_name, phone } = updateData;
    
    const query = `
      UPDATE users 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, telegram_id, role, first_name, last_name, phone, updated_at
    `;
    
    const values = [first_name, last_name, phone, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Удаление пользователя (мягкое удаление не делаем, просто удаляем)
  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = User;