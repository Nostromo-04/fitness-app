const db = require('../config/database');

class DayExercise {
  // Добавление упражнения в день
  static async create(exerciseData) {
    const { day_id, exercise_id, sets_count, default_reps, default_weight, order_index } = exerciseData;
    
    const query = `
      INSERT INTO day_exercises (day_id, exercise_id, sets_count, default_reps, default_weight, order_index)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, day_id, exercise_id, sets_count, default_reps, default_weight, order_index
    `;
    
    const values = [day_id, exercise_id, sets_count, default_reps, default_weight || 0, order_index];
    
    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Получение всех упражнений дня
  static async findByDayId(dayId) {
    const query = `
      SELECT de.*, e.name as exercise_name, e.muscle_group, e.image_url, e.video_url
      FROM day_exercises de
      JOIN exercises e ON de.exercise_id = e.id
      WHERE de.day_id = $1
      ORDER BY de.order_index
    `;
    
    const result = await db.query(query, [dayId]);
    return result.rows;
  }

  // Обновление упражнения в дне
  static async update(id, updateData) {
    const { sets_count, default_reps, default_weight, order_index } = updateData;
    
    const query = `
      UPDATE day_exercises 
      SET sets_count = COALESCE($1, sets_count),
          default_reps = COALESCE($2, default_reps),
          default_weight = COALESCE($3, default_weight),
          order_index = COALESCE($4, order_index)
      WHERE id = $5
      RETURNING id, day_id, exercise_id, sets_count, default_reps, default_weight, order_index
    `;
    
    const values = [sets_count, default_reps, default_weight, order_index, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Удаление упражнения из дня
  static async delete(id) {
    const query = 'DELETE FROM day_exercises WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Обновление порядка упражнений (для drag-and-drop)
  static async reorder(dayId, exerciseOrders) {
    // exerciseOrders - массив [{ id, order_index }]
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const item of exerciseOrders) {
        await client.query(
          'UPDATE day_exercises SET order_index = $1 WHERE id = $2 AND day_id = $3',
          [item.order_index, item.id, dayId]
        );
      }
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = DayExercise;