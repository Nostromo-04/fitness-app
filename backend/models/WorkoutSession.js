const db = require('../config/database');

class WorkoutSession {
  // Создание новой тренировочной сессии (когда спортсмен начинает тренировку)
  static async create(sessionData) {
    const { athlete_id, plan_id, day_id } = sessionData;
    
    const query = `
      INSERT INTO workout_sessions (athlete_id, plan_id, day_id, workout_date)
      VALUES ($1, $2, $3, CURRENT_DATE)
      RETURNING id, athlete_id, plan_id, day_id, workout_date, created_at
    `;
    
    const values = [athlete_id, plan_id, day_id];
    
    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Получение текущей активной сессии спортсмена (незавершенной тренировки)
  static async getActiveSession(athleteId) {
    const query = `
      SELECT * FROM workout_sessions 
      WHERE athlete_id = $1 AND completed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const result = await db.query(query, [athleteId]);
    return result.rows[0];
  }

  // Завершение тренировки (принудительное)
static async complete(sessionId, feedbackEmoji = null) {
  const query = `
    UPDATE workout_sessions 
    SET completed_at = CURRENT_TIMESTAMP,
        feedback_emoji = COALESCE($2, feedback_emoji)
    WHERE id = $1
    RETURNING id, athlete_id, plan_id, day_id, workout_date, feedback_emoji, completed_at
  `;
  
  const result = await db.query(query, [sessionId, feedbackEmoji]);
  return result.rows[0];
}

  // Получение всех тренировок спортсмена за период (для календаря)
  static async getAthleteSessions(athleteId, startDate, endDate) {
    const query = `
      SELECT 
        ws.id,
        ws.athlete_id,
        ws.plan_id,
        ws.day_id,
        ws.workout_date,
        ws.feedback_emoji,
        ws.completed_at,
        wp.name as plan_name,
        wd.day_number
      FROM workout_sessions ws
      JOIN workout_plans wp ON ws.plan_id = wp.id
      JOIN workout_days wd ON ws.day_id = wd.id
      WHERE ws.athlete_id = $1 
        AND ws.workout_date BETWEEN $2 AND $3
        AND ws.completed_at IS NOT NULL
      ORDER BY ws.workout_date DESC
    `;
    
    const result = await db.query(query, [athleteId, startDate, endDate]);
    return result.rows;
  }

  // Получение деталей конкретной тренировки (для тренера)
  static async getSessionDetails(sessionId) {
    const query = `
      SELECT 
        ws.*,
        wp.name as plan_name,
        wd.day_number,
        u.first_name as athlete_first_name,
        u.last_name as athlete_last_name,
        json_agg(
          json_build_object(
            'set_id', sl.id,
            'exercise_id', sl.exercise_id,
            'exercise_name', e.name,
            'muscle_group', e.muscle_group,
            'set_number', sl.set_number,
            'reps_done', sl.reps_done,
            'weight_done', sl.weight_done,
            'is_completed', sl.is_completed,
            'image_url', e.image_url,
            'video_url', e.video_url
          ) ORDER BY e.name, sl.set_number
        ) as sets
      FROM workout_sessions ws
      JOIN workout_plans wp ON ws.plan_id = wp.id
      JOIN workout_days wd ON ws.day_id = wd.id
      JOIN users u ON ws.athlete_id = u.id
      LEFT JOIN set_logs sl ON ws.id = sl.session_id
      LEFT JOIN exercises e ON sl.exercise_id = e.id
      WHERE ws.id = $1
      GROUP BY ws.id, wp.id, wd.id, u.id
    `;
    
    const result = await db.query(query, [sessionId]);
    return result.rows[0];
  }

  // Получение всех тренировок спортсмена для календаря тренера
  static async getAthleteSessionsForCoach(athleteId, year, month) {
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
    
    const query = `
      SELECT 
        workout_date,
        feedback_emoji,
        COUNT(*) as sessions_count,
        json_agg(
          json_build_object(
            'id', id,
            'plan_name', (SELECT name FROM workout_plans WHERE id = ws.plan_id),
            'day_number', (SELECT day_number FROM workout_days WHERE id = ws.day_id)
          )
        ) as sessions
      FROM workout_sessions ws
      WHERE athlete_id = $1 
        AND workout_date BETWEEN $2 AND $3
        AND completed_at IS NOT NULL
      GROUP BY workout_date, feedback_emoji
      ORDER BY workout_date
    `;
    
    const result = await db.query(query, [athleteId, startDate, endDate]);
    return result.rows;
  }

  // Статистика прогресса спортсмена по конкретному упражнению
  static async getExerciseProgress(athleteId, exerciseId, limit = 10) {
    const query = `
      SELECT 
        sl.reps_done,
        sl.weight_done,
        sl.created_at,
        ws.workout_date,
        wp.name as plan_name,
        wd.day_number
      FROM set_logs sl
      JOIN workout_sessions ws ON sl.session_id = ws.id
      JOIN workout_plans wp ON ws.plan_id = wp.id
      JOIN workout_days wd ON ws.day_id = wd.id
      WHERE ws.athlete_id = $1 
        AND sl.exercise_id = $2
        AND sl.is_completed = true
      ORDER BY ws.workout_date DESC, sl.created_at DESC
      LIMIT $3
    `;
    
    const result = await db.query(query, [athleteId, exerciseId, limit]);
    return result.rows;
  }
}

module.exports = WorkoutSession;