const { canStartAssignedWorkout } = require('./planAssignments');

function actorRole(user) {
  return user.role === 'athlete' ? 'athlete' : 'coach';
}

async function findActiveWorkout(queryable, athleteId, forUpdate = false) {
  const result = await queryable.query(
    `SELECT aw.athlete_id, aw.session_id, aw.started_by_user_id,
            aw.started_by_role, aw.started_at, aw.updated_at,
            ws.plan_id, ws.day_id, ws.workout_date, ws.created_at
       FROM active_workouts aw
       JOIN workout_sessions ws ON ws.id = aw.session_id
      WHERE aw.athlete_id = $1
      ${forUpdate ? 'FOR UPDATE OF aw' : ''}`,
    [Number(athleteId)]
  );
  return result.rows[0] || null;
}

function startResult(active, user) {
  const sameActor = Number(active.started_by_user_id) === Number(user.id)
    && active.started_by_role === actorRole(user);
  return {
    kind: sameActor ? 'resumed' : 'conflict',
    session: {
      id: active.session_id,
      athlete_id: active.athlete_id,
      plan_id: active.plan_id,
      day_id: active.day_id,
      workout_date: active.workout_date,
      created_at: active.created_at,
      started_by_role: active.started_by_role,
      resumed: sameActor,
    },
  };
}

async function startActiveWorkout(pool, { athleteId, planId, dayId, user }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (!await canStartAssignedWorkout(client, athleteId, planId, dayId)) {
      await client.query('ROLLBACK');
      return { kind: 'not_assigned' };
    }

    const active = await findActiveWorkout(client, athleteId, true);
    if (active) {
      await client.query('COMMIT');
      return startResult(active, user);
    }

    const sessionResult = await client.query(
      `INSERT INTO workout_sessions (athlete_id, plan_id, day_id, workout_date)
       VALUES ($1, $2, $3, CURRENT_DATE)
       RETURNING id, athlete_id, plan_id, day_id, workout_date, created_at`,
      [Number(athleteId), Number(planId), Number(dayId)]
    );
    const session = sessionResult.rows[0];
    await client.query(
      `INSERT INTO active_workouts
         (athlete_id, session_id, started_by_user_id, started_by_role)
       VALUES ($1, $2, $3, $4)`,
      [Number(athleteId), session.id, Number(user.id), actorRole(user)]
    );
    await client.query('COMMIT');
    return {
      kind: 'created',
      session: { ...session, started_by_role: actorRole(user), resumed: false },
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    // Два пользователя могли одновременно увидеть отсутствие блокировки.
    // Первичный ключ athlete_id разрешит старт только одному из них.
    if (error.code === '23505') {
      const active = await findActiveWorkout(pool, athleteId);
      if (active) return startResult(active, user);
    }
    throw error;
  } finally {
    client.release();
  }
}

async function finishActiveWorkout(pool, { sessionId, userId, feedbackEmoji }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const activeResult = await client.query(
      `SELECT aw.session_id, aw.started_by_user_id
         FROM active_workouts aw
        WHERE aw.session_id = $1
        FOR UPDATE`,
      [Number(sessionId)]
    );
    const active = activeResult.rows[0];
    if (!active) {
      await client.query('ROLLBACK');
      return { kind: 'not_active' };
    }
    if (Number(active.started_by_user_id) !== Number(userId)) {
      await client.query('ROLLBACK');
      return { kind: 'forbidden' };
    }

    const completed = await client.query(
      `UPDATE workout_sessions
          SET completed_at = CURRENT_TIMESTAMP, feedback_emoji = $2
        WHERE id = $1
        RETURNING id, athlete_id, plan_id, day_id, workout_date,
                  feedback_emoji, completed_at, created_at`,
      [Number(sessionId), feedbackEmoji]
    );
    await client.query('DELETE FROM active_workouts WHERE session_id = $1', [Number(sessionId)]);
    await client.query('COMMIT');
    return { kind: 'completed', session: completed.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function cancelActiveWorkout(pool, { sessionId, userId }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const activeResult = await client.query(
      `SELECT aw.session_id, aw.started_by_user_id
         FROM active_workouts aw
        WHERE aw.session_id = $1
        FOR UPDATE`,
      [Number(sessionId)]
    );
    const active = activeResult.rows[0];
    if (!active) {
      await client.query('ROLLBACK');
      return { kind: 'not_active' };
    }
    if (Number(active.started_by_user_id) !== Number(userId)) {
      await client.query('ROLLBACK');
      return { kind: 'forbidden' };
    }

    await client.query('DELETE FROM active_workouts WHERE session_id = $1', [Number(sessionId)]);
    await client.query(
      'DELETE FROM workout_sessions WHERE id = $1 AND completed_at IS NULL',
      [Number(sessionId)]
    );
    await client.query('COMMIT');
    return { kind: 'cancelled' };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  actorRole,
  cancelActiveWorkout,
  findActiveWorkout,
  finishActiveWorkout,
  startActiveWorkout,
};
