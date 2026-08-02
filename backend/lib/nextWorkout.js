async function findLastCompletedPlanDay(pool, athleteId, planId) {
  const result = await pool.query(
    `SELECT ws.id, ws.workout_date, ws.completed_at, wd.day_number
       FROM workout_sessions ws
       JOIN workout_days wd ON wd.id = ws.day_id
      WHERE ws.athlete_id = $1
        AND ws.plan_id = $2
        AND ws.completed_at IS NOT NULL
      ORDER BY ws.workout_date DESC, ws.completed_at DESC, ws.id DESC
      LIMIT 1`,
    [athleteId, planId]
  );

  return result.rows[0] || null;
}

module.exports = { findLastCompletedPlanDay };
