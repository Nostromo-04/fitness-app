async function listAssignedPlans(db, athleteId) {
  return db.query(
    `SELECT wp.id, wp.name, wp.coach_id, wp.created_at, pa.assigned_at,
            COUNT(wd.id)::int AS days_count
       FROM plan_assignments pa
       JOIN workout_plans wp ON wp.id = pa.plan_id
       LEFT JOIN workout_days wd ON wd.plan_id = wp.id
      WHERE pa.athlete_id = $1
      GROUP BY wp.id, pa.assigned_at
      ORDER BY pa.assigned_at DESC`,
    [athleteId]
  );
}

async function assignPlanToAthlete(db, planId, athleteId) {
  return db.query(
    `INSERT INTO plan_assignments (plan_id, athlete_id)
     SELECT wp.id, u.id
       FROM workout_plans wp
       JOIN users u ON u.id = $2
      WHERE wp.id = $1
        AND u.role = 'athlete'
        AND u.coach_id = wp.coach_id
     ON CONFLICT (plan_id, athlete_id)
     DO UPDATE SET assigned_at = plan_assignments.assigned_at
     RETURNING id, plan_id, athlete_id, assigned_at`,
    [planId, athleteId]
  );
}

async function listAssignedAthletes(db, planId) {
  return db.query(
    `SELECT u.id, u.telegram_id, u.first_name, u.last_name, u.phone, pa.assigned_at
       FROM plan_assignments pa
       JOIN users u ON u.id = pa.athlete_id
      WHERE pa.plan_id = $1 AND u.role = 'athlete'
      ORDER BY u.first_name, u.last_name`,
    [planId]
  );
}

async function unassignPlanFromAthlete(db, planId, athleteId) {
  return db.query(
    `DELETE FROM plan_assignments
      WHERE plan_id = $1 AND athlete_id = $2
      RETURNING plan_id, athlete_id`,
    [planId, athleteId]
  );
}

async function canStartAssignedWorkout(db, athleteId, planId, dayId) {
  const result = await db.query(
    `SELECT 1
       FROM plan_assignments pa
       JOIN workout_days wd ON wd.plan_id = pa.plan_id
      WHERE pa.athlete_id = $1 AND pa.plan_id = $2 AND wd.id = $3`,
    [athleteId, planId, dayId]
  );
  return !!result.rows[0];
}

module.exports = {
  assignPlanToAthlete,
  canStartAssignedWorkout,
  listAssignedAthletes,
  listAssignedPlans,
  unassignPlanFromAthlete,
};
