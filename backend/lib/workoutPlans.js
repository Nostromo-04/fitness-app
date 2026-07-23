async function createWorkoutPlan(pool, { name, coachId, days }) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const coach = await client.query(
      `SELECT 1 FROM users WHERE id = $1 AND role = 'coach'`,
      [coachId]
    );
    if (!coach.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    const planResult = await client.query(
      `INSERT INTO workout_plans (name, coach_id) VALUES ($1, $2)
       RETURNING id, name, coach_id, created_at`,
      [name, coachId]
    );
    const plan = planResult.rows[0];
    const createdDays = [];

    for (const day of days) {
      const dayResult = await client.query(
        `INSERT INTO workout_days (plan_id, day_number) VALUES ($1, $2)
         RETURNING id, plan_id, day_number`,
        [plan.id, day.day_number]
      );
      const createdDay = dayResult.rows[0];

      for (let index = 0; index < (day.exercises || []).length; index += 1) {
        const exercise = day.exercises[index];
        await client.query(
          `INSERT INTO day_exercises
             (day_id, exercise_id, sets_count, default_reps, default_weight, order_index)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            createdDay.id,
            exercise.exercise_id,
            exercise.sets_count ?? 3,
            exercise.default_reps ?? 10,
            exercise.default_weight ?? null,
            exercise.order_index ?? index,
          ]
        );
      }

      createdDays.push({ ...createdDay, exercises: [] });
    }

    await client.query('COMMIT');
    return { ...plan, days: createdDays };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { createWorkoutPlan };
