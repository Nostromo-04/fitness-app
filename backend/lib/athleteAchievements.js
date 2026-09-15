function startOfUtcWeek(value) {
  const date = new Date(value);
  const day = date.getUTCDay() || 7;
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date;
}

function calculateActiveWeekStreak(dateValues, now = new Date()) {
  const weeks = [...new Set(dateValues.map(value => startOfUtcWeek(value).getTime()))].sort((a, b) => b - a);
  if (weeks.length === 0) return 0;
  const currentWeek = startOfUtcWeek(now).getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  if (weeks[0] < currentWeek - weekMs) return 0;
  let streak = 1;
  for (let index = 1; index < weeks.length; index += 1) {
    if (weeks[index - 1] - weeks[index] !== weekMs) break;
    streak += 1;
  }
  return streak;
}

async function getAthleteAchievementMetrics(db, athleteId) {
  const [recordResult, datesResult] = await Promise.all([
    db.query(
      `WITH session_bests AS (
         SELECT sl.exercise_id, ws.id AS session_id, ws.workout_date, ws.completed_at,
                MAX(sl.weight_done) AS max_weight
           FROM set_logs sl
           JOIN workout_sessions ws ON ws.id = sl.session_id
          WHERE ws.athlete_id = $1
            AND ws.completed_at IS NOT NULL
            AND sl.is_completed = true
          GROUP BY sl.exercise_id, ws.id, ws.workout_date, ws.completed_at
       ), record_events AS (
         SELECT *, MAX(max_weight) OVER (
           PARTITION BY exercise_id
           ORDER BY workout_date, completed_at, session_id
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
         ) AS previous_best
         FROM session_bests
       )
       SELECT COUNT(*) FILTER (
         WHERE previous_best IS NOT NULL AND max_weight > previous_best
       )::int AS personal_records
       FROM record_events`,
      [athleteId]
    ),
    db.query(
      `SELECT DISTINCT ws.workout_date
         FROM workout_sessions ws
        WHERE ws.athlete_id = $1 AND ws.completed_at IS NOT NULL
        ORDER BY ws.workout_date DESC`,
      [athleteId]
    ),
  ]);
  return {
    personal_records: recordResult.rows[0]?.personal_records || 0,
    active_week_streak: calculateActiveWeekStreak(datesResult.rows.map(row => row.workout_date)),
  };
}

async function getExerciseWorkoutProgress(db, athleteId, exerciseId) {
  const result = await db.query(
    `SELECT
       ws.id AS session_id,
       ws.workout_date,
       wp.name AS plan_name,
       wd.day_number,
       MAX(sl.weight_done)::float AS max_weight,
       MAX(sl.reps_done)::int AS max_reps,
       (ARRAY_AGG(sl.reps_done ORDER BY sl.weight_done DESC, sl.reps_done DESC))[1]::int AS reps_at_max_weight,
       COALESCE(SUM(sl.weight_done * sl.reps_done), 0)::float AS total_volume
     FROM set_logs sl
     JOIN workout_sessions ws ON ws.id = sl.session_id
     JOIN workout_plans wp ON wp.id = ws.plan_id
     JOIN workout_days wd ON wd.id = ws.day_id
     WHERE ws.athlete_id = $1
       AND sl.exercise_id = $2
       AND sl.is_completed = true
       AND ws.completed_at IS NOT NULL
     GROUP BY ws.id, ws.workout_date, wp.name, wd.day_number
     ORDER BY ws.workout_date, ws.id`,
    [athleteId, exerciseId]
  );
  const workouts = result.rows;
  const first = workouts[0] || null;
  const latest = workouts[workouts.length - 1] || null;
  const gain = first && latest ? Number(latest.max_weight) - Number(first.max_weight) : 0;
  return {
    workouts,
    insights: {
      first,
      latest,
      weight_gain: gain,
      weight_gain_percent: first && Number(first.max_weight) > 0 ? Math.round((gain / Number(first.max_weight)) * 100) : 0,
    },
  };
}

module.exports = {
  calculateActiveWeekStreak,
  getAthleteAchievementMetrics,
  getExerciseWorkoutProgress,
};
