const test = require('node:test');
const assert = require('node:assert/strict');
const { getCompletedWorkoutExercises } = require('../lib/athleteExercises');

test('progress selector lists only exercises logged in completed workouts', async () => {
  let captured;
  const rows = [{ id: 7, name: 'Жим лёжа', muscle_group: 'Грудь', image_url: '/bench.jpg' }];
  const db = { async query(sql, params) { captured = { sql, params }; return { rows }; } };
  const result = await getCompletedWorkoutExercises(db, 42);
  assert.deepEqual(result, rows);
  assert.deepEqual(captured.params, [42]);
  assert.match(captured.sql, /JOIN workout_sessions/);
  assert.match(captured.sql, /completed_at IS NOT NULL/);
  assert.match(captured.sql, /sl\.is_completed = true/);
  assert.match(captured.sql, /GROUP BY e\.id/);
});
