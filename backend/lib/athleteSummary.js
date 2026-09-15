async function getCurrentYearWorkoutSummary(db, athleteId) {
  const result = await db.query(
    `SELECT
       COUNT(*)::int AS total_workouts,
       COUNT(*) FILTER (WHERE ws.feedback_emoji = '👍')::int AS light_workouts,
       COUNT(*) FILTER (WHERE ws.feedback_emoji = '👎')::int AS heavy_workouts,
       MAX(ws.workout_date) AS last_workout_date
     FROM workout_sessions ws
     WHERE ws.athlete_id = $1
       AND ws.completed_at IS NOT NULL
       AND ws.workout_date >= DATE_TRUNC('year', CURRENT_DATE)::date
       AND ws.workout_date < (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year')::date`,
    [athleteId]
  );
  return result.rows[0] || { total_workouts: 0, light_workouts: 0, heavy_workouts: 0, last_workout_date: null };
}

module.exports = { getCurrentYearWorkoutSummary };
