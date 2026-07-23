const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorkoutPlan } = require('../lib/workoutPlans');

function fakePool({ coachExists = true, failOnDay = false } = {}) {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rows: [] };
      if (sql.includes("FROM users")) return { rows: coachExists ? [{ exists: 1 }] : [] };
      if (sql.includes('INSERT INTO workout_plans')) {
        return {
          rows: [{
            id: 21,
            name: values[0],
            coach_id: values[1],
            created_at: '2026-07-23T00:00:00.000Z',
          }],
        };
      }
      if (sql.includes('INSERT INTO workout_days')) {
        if (failOnDay && values[1] === 2) throw new Error('day insert failed');
        return { rows: [{ id: 100 + values[1], plan_id: values[0], day_number: values[1] }] };
      }
      if (sql.includes('INSERT INTO day_exercises')) return { rows: [] };
      throw new Error(`Unexpected query: ${sql}`);
    },
    release() {
      calls.push({ sql: 'RELEASE' });
    },
  };

  return {
    calls,
    pool: { async connect() { return client; } },
  };
}

test('creates a plan and all initial days in one transaction', async () => {
  const { pool, calls } = fakePool();
  const plan = await createWorkoutPlan(pool, {
    name: 'Силовой план',
    coachId: 7,
    days: [1, 2, 3].map(day_number => ({ day_number, exercises: [] })),
  });

  assert.equal(plan.id, 21);
  assert.deepEqual(plan.days.map(day => day.day_number), [1, 2, 3]);
  assert.equal(calls[0].sql, 'BEGIN');
  assert.equal(calls.at(-2).sql, 'COMMIT');
  assert.equal(calls.at(-1).sql, 'RELEASE');
});

test('rolls the whole plan back when an initial day cannot be created', async () => {
  const { pool, calls } = fakePool({ failOnDay: true });

  await assert.rejects(
    createWorkoutPlan(pool, {
      name: 'Силовой план',
      coachId: 7,
      days: [1, 2, 3].map(day_number => ({ day_number, exercises: [] })),
    }),
    /day insert failed/
  );

  assert.equal(calls.some(call => call.sql === 'COMMIT'), false);
  assert.equal(calls.at(-2).sql, 'ROLLBACK');
  assert.equal(calls.at(-1).sql, 'RELEASE');
});

test('does not create a plan for a missing coach', async () => {
  const { pool, calls } = fakePool({ coachExists: false });
  const plan = await createWorkoutPlan(pool, {
    name: 'Силовой план',
    coachId: 999,
    days: [],
  });

  assert.equal(plan, null);
  assert.equal(calls.some(call => call.sql.includes('INSERT INTO workout_plans')), false);
  assert.equal(calls.at(-2).sql, 'ROLLBACK');
  assert.equal(calls.at(-1).sql, 'RELEASE');
});
