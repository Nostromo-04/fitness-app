async function getCompletedWorkoutExercises(db, athleteId) {
  const result = await db.query(
    `SELECT
       e.id,
       e.name,
       e.muscle_group,
       e.image_url,
       e.video_url,
       MAX(ws.workout_date) AS last_used_at
     FROM set_logs sl
     JOIN workout_sessions ws ON ws.id = sl.session_id
     JOIN exercises e ON e.id = sl.exercise_id
     WHERE ws.athlete_id = $1
       AND ws.completed_at IS NOT NULL
       AND sl.is_completed = true
     GROUP BY e.id, e.name, e.muscle_group, e.image_url, e.video_url
     ORDER BY MAX(ws.workout_date) DESC, e.name`,
    [athleteId]
  );
  return result.rows;
}

module.exports = { getCompletedWorkoutExercises };
