const test = require('node:test');
const assert = require('node:assert/strict');
const { findLastCompletedPlanDay } = require('../lib/nextWorkout');

test('finds the latest completed plan day across a month boundary', async () => {
  const calls = [];
  const pool = {
    async query(sql, values) {
      calls.push({ sql, values });
      return {
        rows: [{
          id: 91,
          workout_date: '2026-07-31',
          completed_at: '2026-07-31T20:00:00Z',
          day_number: 2,
        }],
      };
    },
  };

  const session = await findLastCompletedPlanDay(pool, 42, 13);

  assert.equal(session.day_number, 2);
  assert.deepEqual(calls[0].values, [42, 13]);
  assert.match(calls[0].sql, /ORDER BY ws\.workout_date DESC/);
  assert.doesNotMatch(calls[0].sql, /BETWEEN|EXTRACT\s*\(\s*MONTH/i);
});

test('returns null when the athlete has not completed this plan', async () => {
  const pool = { async query() { return { rows: [] }; } };
  assert.equal(await findLastCompletedPlanDay(pool, 42, 13), null);
});
