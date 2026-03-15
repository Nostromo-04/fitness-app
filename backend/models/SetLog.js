const db = require('../config/database');

class SetLog {
  // Логирование выполненного подхода
  static async logSet(setData) {
    const { session_id, exercise_id, set_number, reps_done, weight_done, is_completed } = setData;
    
    // Проверяем, существует ли уже запись для этого подхода
    const checkQuery = `
      SELECT id FROM set_logs 
      WHERE session_id = $1 AND exercise_id = $2 AND set_number = $3
    `;
    
    const existing = await db.query(checkQuery, [session_id, exercise_id, set_number]);
    
    if (existing.rows.length > 0) {
      // Обновляем существующий подход
      const updateQuery = `
        UPDATE set_logs 
        SET reps_done = $4, weight_done = $5, is_completed = $6
        WHERE session_id = $1 AND exercise_id = $2 AND set_number = $3
        RETURNING id, session_id, exercise_id, set_number, reps_done, weight_done, is_completed, created_at
      `;
      const result = await db.query(updateQuery, [session_id, exercise_id, set_number, reps_done, weight_done, is_completed]);
      return result.rows[0];
    } else {
      // Создаем новый подход
      const insertQuery = `
        INSERT INTO set_logs (session_id, exercise_id, set_number, reps_done, weight_done, is_completed)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, session_id, exercise_id, set_number, reps_done, weight_done, is_completed, created_at
      `;
      const result = await db.query(insertQuery, [session_id, exercise_id, set_number, reps_done, weight_done, is_completed]);
      return result.rows[0];
    }
  }

  // Получение всех подходов тренировки
  static async getSessionSets(sessionId) {
    const query = `
      SELECT sl.*, e.name as exercise_name, e.muscle_group
      FROM set_logs sl
      JOIN exercises e ON sl.exercise_id = e.id
      WHERE sl.session_id = $1
      ORDER BY e.name, sl.set_number
    `;
    
    const result = await db.query(query, [sessionId]);
    return result.rows;
  }

  // Получение прогресса по упражнению в рамках одной тренировки
  static async getExerciseSets(sessionId, exerciseId) {
    const query = `
      SELECT * FROM set_logs
      WHERE session_id = $1 AND exercise_id = $2
      ORDER BY set_number
    `;
    
    const result = await db.query(query, [sessionId, exerciseId]);
    return result.rows;
  }

  // Удаление подхода (если спортсмен ошибся)
  static async deleteSet(setId) {
    const query = 'DELETE FROM set_logs WHERE id = $1 RETURNING id';
    const result = await db.query(query, [setId]);
    return result.rows[0];
  }

  // Получение лучшего результата спортсмена по упражнению
  static async getPersonalBest(athleteId, exerciseId) {
    const query = `
      SELECT 
        MAX(sl.weight_done) as max_weight,
        MAX(sl.reps_done) as max_reps,
        sl.weight_done,
        sl.reps_done,
        sl.created_at,
        ws.workout_date
      FROM set_logs sl
      JOIN workout_sessions ws ON sl.session_id = ws.id
      WHERE ws.athlete_id = $1 
        AND sl.exercise_id = $2
        AND sl.is_completed = true
      GROUP BY sl.weight_done, sl.reps_done, sl.created_at, ws.workout_date
      ORDER BY sl.weight_done DESC, sl.reps_done DESC
      LIMIT 1
    `;
    
    const result = await db.query(query, [athleteId, exerciseId]);
    return result.rows[0];
  }
}

module.exports = SetLog;