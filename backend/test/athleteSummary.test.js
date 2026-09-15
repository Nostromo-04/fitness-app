const test = require('node:test');
const assert = require('node:assert/strict');
const { getCurrentYearWorkoutSummary } = require('../lib/athleteSummary');

test('dashboard summary counts completed workouts and feedback in the current year', async () => {
  let captured;
  const db = { async query(sql, params) {
    captured = { sql, params };
    return { rows: [{ total_workouts: 3, light_workouts: 2, heavy_workouts: 1 }] };
  } };
  const summary = await getCurrentYearWorkoutSummary(db, 42);
  assert.deepEqual(captured.params, [42]);
  assert.match(captured.sql, /completed_at IS NOT NULL/);
  assert.match(captured.sql, /DATE_TRUNC\('year', CURRENT_DATE\)/);
  assert.match(captured.sql, /feedback_emoji = '👍'/);
  assert.match(captured.sql, /feedback_emoji = '👎'/);
  assert.deepEqual(summary, { total_workouts: 3, light_workouts: 2, heavy_workouts: 1 });
});
