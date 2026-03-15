const db = require('../config/database');

class WorkoutPlan {
  // Создание нового плана
  static async create(planData) {
    const { name, coach_id } = planData;
    
    const query = `
      INSERT INTO workout_plans (name, coach_id)
      VALUES ($1, $2)
      RETURNING id, name, coach_id, created_at
    `;
    
    const values = [name, coach_id];
    
    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Получение всех планов тренера
  static async findByCoachId(coachId) {
    const query = `
      SELECT wp.*, 
             COUNT(DISTINCT wd.id) as days_count,
             COUNT(DISTINCT pa.athlete_id) as athletes_count
      FROM workout_plans wp
      LEFT JOIN workout_days wd ON wp.id = wd.plan_id
      LEFT JOIN plan_assignments pa ON wp.id = pa.plan_id
      WHERE wp.coach_id = $1
      GROUP BY wp.id
      ORDER BY wp.created_at DESC
    `;
    
    const result = await db.query(query, [coachId]);
    return result.rows;
  }

  // Получение плана по ID с полной структурой (ИСПРАВЛЕННАЯ ВЕРСИЯ)
static async findByIdWithDetails(id) {
  const query = `
    SELECT 
      wp.*,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', wd.id,
              'day_number', wd.day_number,
              'exercises', COALESCE((
                SELECT json_agg(
                  json_build_object(
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
                  ) ORDER BY de.order_index
                )
                FROM day_exercises de
                JOIN exercises e ON de.exercise_id = e.id
                WHERE de.day_id = wd.id
              ), '[]'::json)
            ) ORDER BY wd.day_number
          )
          FROM workout_days wd
          WHERE wd.plan_id = wp.id
        ), '[]'::json
      ) as days
    FROM workout_plans wp
    WHERE wp.id = $1
  `;
  
  try {
    const result = await db.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error('SQL Error in findByIdWithDetails:', error);
    throw error;
  }
}

  // Назначение плана спортсмену
  static async assignToAthlete(planId, athleteId) {
    const query = `
      INSERT INTO plan_assignments (plan_id, athlete_id)
      VALUES ($1, $2)
      ON CONFLICT (plan_id, athlete_id) DO NOTHING
      RETURNING id, plan_id, athlete_id, assigned_at
    `;
    
    const result = await db.query(query, [planId, athleteId]);
    return result.rows[0];
  }

  // Получение спортсменов, которым назначен план
  static async getAssignedAthletes(planId) {
    const query = `
      SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.phone, pa.assigned_at
      FROM plan_assignments pa
      JOIN users u ON pa.athlete_id = u.id
      WHERE pa.plan_id = $1 AND u.role = 'athlete'
      ORDER BY u.first_name
    `;
    
    const result = await db.query(query, [planId]);
    return result.rows;
  }

  // Обновление плана
  static async update(id, updateData) {
    const { name } = updateData;
    
    const query = `
      UPDATE workout_plans 
      SET name = COALESCE($1, name)
      WHERE id = $2
      RETURNING id, name, coach_id, created_at
    `;
    
    const result = await db.query(query, [name, id]);
    return result.rows[0];
  }

  // Удаление плана
  static async delete(id) {
    const query = 'DELETE FROM workout_plans WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = WorkoutPlan;