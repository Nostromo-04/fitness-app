const db = require('../config/database');

class WorkoutDay {
  // Создание дня в плане
  static async create(dayData) {
    const { plan_id, day_number } = dayData;
    
    const query = `
      INSERT INTO workout_days (plan_id, day_number)
      VALUES ($1, $2)
      RETURNING id, plan_id, day_number
    `;
    
    const result = await db.query(query, [plan_id, day_number]);
    return result.rows[0];
  }

  // Получение всех дней плана
  static async findByPlanId(planId) {
    const query = `
      SELECT wd.*, 
             json_agg(jsonb_build_object(
               'id', de.id,
               'exercise_id', de.exercise_id,
               'exercise_name', e.name,
               'muscle_group', e.muscle_group,
               'sets_count', de.sets_count,
               'default_reps', de.default_reps,
               'default_weight', de.default_weight,
               'order_index', de.order_index,
               'image_url', e.image_url,
               'video_url', e.video_url
             ) ORDER BY de.order_index) as exercises
      FROM workout_days wd
      LEFT JOIN day_exercises de ON wd.id = de.day_id
      LEFT JOIN exercises e ON de.exercise_id = e.id
      WHERE wd.plan_id = $1
      GROUP BY wd.id
      ORDER BY wd.day_number
    `;
    
    const result = await db.query(query, [planId]);
    return result.rows;
  }

  // Получение конкретного дня
  static async findById(id) {
    const query = `
      SELECT wd.*, 
             json_agg(jsonb_build_object(
               'id', de.id,
               'exercise_id', de.exercise_id,
               'exercise_name', e.name,
               'muscle_group', e.muscle_group,
               'sets_count', de.sets_count,
               'default_reps', de.default_reps,
               'default_weight', de.default_weight,
               'order_index', de.order_index
             ) ORDER BY de.order_index) as exercises
      FROM workout_days wd
      LEFT JOIN day_exercises de ON wd.id = de.day_id
      LEFT JOIN exercises e ON de.exercise_id = e.id
      WHERE wd.id = $1
      GROUP BY wd.id
    `;
    
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Удаление дня
  static async delete(id) {
    const query = 'DELETE FROM workout_days WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = WorkoutDay;