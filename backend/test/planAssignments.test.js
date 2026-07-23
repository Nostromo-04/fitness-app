const test = require('node:test');
const assert = require('node:assert/strict');
const {
  assignPlanToAthlete,
  canStartAssignedWorkout,
  listAssignedPlans,
  unassignPlanFromAthlete,
} = require('../lib/planAssignments');

test('athlete plan list is sourced only from plan_assignments', async () => {
  let query;
  const db = {
    async query(sql, values) {
      query = { sql, values };
      return { rows: [] };
    },
  };

  const result = await listAssignedPlans(db, 42);
  assert.deepEqual(result.rows, []);
  assert.match(query.sql, /FROM plan_assignments pa/);
  assert.match(query.sql, /WHERE pa\.athlete_id = \$1/);
  assert.equal(query.sql.includes('WHERE wp.coach_id'), false);
  assert.deepEqual(query.values, [42]);
});

test('assignment requires the athlete and plan to belong to the same coach', async () => {
  let query;
  const db = {
    async query(sql, values) {
      query = { sql, values };
      return { rows: [{ plan_id: 13, athlete_id: 42 }] };
    },
  };

  const result = await assignPlanToAthlete(db, 13, 42);
  assert.deepEqual(result.rows[0], { plan_id: 13, athlete_id: 42 });
  assert.match(query.sql, /u\.coach_id = wp\.coach_id/);
  assert.match(query.sql, /ON CONFLICT \(plan_id, athlete_id\)/);
  assert.deepEqual(query.values, [13, 42]);
});

test('unassigning deletes only the selected athlete-plan relation', async () => {
  let query;
  const db = {
    async query(sql, values) {
      query = { sql, values };
      return { rows: [{ plan_id: 13, athlete_id: 42 }] };
    },
  };

  await unassignPlanFromAthlete(db, 13, 42);
  assert.match(query.sql, /DELETE FROM plan_assignments/);
  assert.deepEqual(query.values, [13, 42]);
});

test('workout can start only for an assigned plan and one of its days', async () => {
  const calls = [];
  const db = {
    async query(sql, values) {
      calls.push({ sql, values });
      return { rows: values[1] === 13 && values[2] === 7 ? [{ exists: 1 }] : [] };
    },
  };

  assert.equal(await canStartAssignedWorkout(db, 42, 13, 7), true);
  assert.equal(await canStartAssignedWorkout(db, 42, 99, 7), false);
  assert.match(calls[0].sql, /JOIN workout_days wd ON wd\.plan_id = pa\.plan_id/);
});
