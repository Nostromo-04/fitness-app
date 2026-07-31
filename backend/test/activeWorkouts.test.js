const test = require('node:test');
const assert = require('node:assert/strict');
const {
  cancelActiveWorkout,
  finishActiveWorkout,
  startActiveWorkout,
} = require('../lib/activeWorkouts');

function fakePool(clientQuery, poolQuery = clientQuery) {
  const client = {
    query: clientQuery,
    release() {},
  };
  return {
    async connect() { return client; },
    query: poolQuery,
  };
}

const activeSession = {
  athlete_id: 42,
  session_id: 100,
  started_by_user_id: 42,
  started_by_role: 'athlete',
  plan_id: 13,
  day_id: 7,
  workout_date: '2026-07-31',
  created_at: '2026-07-31T10:00:00Z',
};

test('creates an athlete workout and its lock in one transaction', async () => {
  const calls = [];
  const pool = fakePool(async (sql, values) => {
    calls.push({ sql, values });
    if (sql.includes('FROM plan_assignments')) return { rows: [{ exists: 1 }] };
    if (sql.includes('FROM active_workouts aw')) return { rows: [] };
    if (sql.includes('INSERT INTO workout_sessions')) {
      return { rows: [{ id: 100, athlete_id: 42, plan_id: 13, day_id: 7 }] };
    }
    return { rows: [] };
  });

  const result = await startActiveWorkout(pool, {
    athleteId: 42,
    planId: 13,
    dayId: 7,
    user: { id: 42, role: 'athlete' },
  });

  assert.equal(result.kind, 'created');
  assert.equal(result.session.started_by_role, 'athlete');
  assert.ok(calls.some(call => call.sql.includes('INSERT INTO active_workouts')));
  assert.ok(calls.some(call => call.sql === 'COMMIT'));
});

test('coach cannot start while the athlete is conducting the workout', async () => {
  const pool = fakePool(async (sql) => {
    if (sql.includes('FROM plan_assignments')) return { rows: [{ exists: 1 }] };
    if (sql.includes('FROM active_workouts aw')) return { rows: [activeSession] };
    return { rows: [] };
  });

  const result = await startActiveWorkout(pool, {
    athleteId: 42,
    planId: 13,
    dayId: 7,
    user: { id: 5, role: 'coach' },
  });
  assert.equal(result.kind, 'conflict');
  assert.equal(result.session.started_by_role, 'athlete');
});

test('athlete cannot start while the coach is conducting the workout', async () => {
  const coachSession = {
    ...activeSession,
    started_by_user_id: 5,
    started_by_role: 'coach',
  };
  const pool = fakePool(async (sql) => {
    if (sql.includes('FROM plan_assignments')) return { rows: [{ exists: 1 }] };
    if (sql.includes('FROM active_workouts aw')) return { rows: [coachSession] };
    return { rows: [] };
  });

  const result = await startActiveWorkout(pool, {
    athleteId: 42,
    planId: 13,
    dayId: 7,
    user: { id: 42, role: 'athlete' },
  });
  assert.equal(result.kind, 'conflict');
  assert.equal(result.session.started_by_role, 'coach');
});

test('the same starter resumes the existing workout', async () => {
  const pool = fakePool(async (sql) => {
    if (sql.includes('FROM plan_assignments')) return { rows: [{ exists: 1 }] };
    if (sql.includes('FROM active_workouts aw')) return { rows: [activeSession] };
    return { rows: [] };
  });

  const result = await startActiveWorkout(pool, {
    athleteId: 42,
    planId: 99,
    dayId: 9,
    user: { id: 42, role: 'athlete' },
  });
  assert.equal(result.kind, 'resumed');
  assert.equal(result.session.plan_id, 13);
  assert.equal(result.session.day_id, 7);
});

test('a database race still allows only one starter', async () => {
  const duplicate = Object.assign(new Error('duplicate'), { code: '23505' });
  const pool = fakePool(
    async (sql) => {
      if (sql.includes('FROM plan_assignments')) return { rows: [{ exists: 1 }] };
      if (sql.includes('FROM active_workouts aw')) return { rows: [] };
      if (sql.includes('INSERT INTO workout_sessions')) {
        return { rows: [{ id: 101, athlete_id: 42, plan_id: 13, day_id: 7 }] };
      }
      if (sql.includes('INSERT INTO active_workouts')) throw duplicate;
      return { rows: [] };
    },
    async (sql) => sql.includes('FROM active_workouts aw')
      ? { rows: [activeSession] }
      : { rows: [] }
  );

  const result = await startActiveWorkout(pool, {
    athleteId: 42,
    planId: 13,
    dayId: 7,
    user: { id: 5, role: 'coach' },
  });
  assert.equal(result.kind, 'conflict');
});

test('completion releases the active workout lock', async () => {
  const calls = [];
  const pool = fakePool(async (sql) => {
    calls.push(sql);
    if (sql.includes('SELECT aw.session_id')) {
      return { rows: [{ session_id: 100, started_by_user_id: 42 }] };
    }
    if (sql.includes('UPDATE workout_sessions')) return { rows: [{ id: 100, completed_at: 'now' }] };
    return { rows: [] };
  });

  const result = await finishActiveWorkout(pool, {
    sessionId: 100,
    userId: 42,
    feedbackEmoji: '👍',
  });
  assert.equal(result.kind, 'completed');
  assert.ok(calls.some(sql => sql.includes('DELETE FROM active_workouts')));
});

test('cancellation removes only the starters unfinished workout', async () => {
  const calls = [];
  const pool = fakePool(async (sql) => {
    calls.push(sql);
    if (sql.includes('SELECT aw.session_id')) {
      return { rows: [{ session_id: 100, started_by_user_id: 5 }] };
    }
    return { rows: [] };
  });

  const result = await cancelActiveWorkout(pool, { sessionId: 100, userId: 5 });
  assert.equal(result.kind, 'cancelled');
  assert.ok(calls.some(sql => sql.includes('DELETE FROM active_workouts')));
  assert.ok(calls.some(sql => sql.includes('DELETE FROM workout_sessions')));
});
