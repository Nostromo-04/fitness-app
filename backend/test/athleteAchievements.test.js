const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateActiveWeekStreak,
  getExerciseWorkoutProgress,
} = require('../lib/athleteAchievements');

test('calculates consecutive active calendar weeks', () => {
  const dates = ['2026-09-14', '2026-09-08', '2026-09-01', '2026-08-20'];
  assert.equal(calculateActiveWeekStreak(dates, new Date('2026-09-16T12:00:00Z')), 3);
  assert.equal(calculateActiveWeekStreak(['2026-08-20'], new Date('2026-09-16T12:00:00Z')), 0);
});

test('aggregates exercise progress by completed workout', async () => {
  let captured;
  const rows = [
    { session_id: 1, max_weight: 20, reps_at_max_weight: 8 },
    { session_id: 2, max_weight: 25, reps_at_max_weight: 10 },
  ];
  const db = { async query(sql, params) { captured = { sql, params }; return { rows }; } };
  const result = await getExerciseWorkoutProgress(db, 4, 9);
  assert.deepEqual(captured.params, [4, 9]);
  assert.match(captured.sql, /GROUP BY ws\.id/);
  assert.match(captured.sql, /ws\.completed_at IS NOT NULL/);
  assert.equal(result.insights.weight_gain, 5);
  assert.equal(result.insights.weight_gain_percent, 25);
});
