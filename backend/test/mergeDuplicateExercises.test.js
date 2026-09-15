const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeLegExtensionDuplicate } = require('../lib/mergeDuplicateExercises');

function createDb(rows) {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql).trim(), params });
      if (String(sql).includes('SELECT id, name')) return { rows };
      if (String(sql).startsWith('DELETE FROM day_exercises')) return { rowCount: 1, rows: [] };
      if (String(sql).startsWith('UPDATE day_exercises')) return { rowCount: 2, rows: [] };
      if (String(sql).startsWith('UPDATE set_logs')) return { rowCount: 3, rows: [] };
      return { rowCount: 1, rows: [] };
    },
    release() { calls.push({ sql: 'RELEASE' }); },
  };
  return { db: { pool: { connect: async () => client } }, calls };
}

const survivor = { id: 20, name: 'Разгибания сидя', muscle_group: 'Ноги' };
const duplicate = {
  id: 99,
  name: 'Разгибание ног сидя в тренажёре',
  muscle_group: 'Ноги',
  image_url: '/legs/0585.jpg',
  video_url: '/legs/0585.gif',
  instruction: 'Инструкция для упражнения',
};

test('merges exercise 99 into 20 and preserves plan and log references', async () => {
  const { db, calls } = createDb([survivor, duplicate]);
  const result = await mergeLegExtensionDuplicate(db);
  assert.deepEqual(result, {
    merged: true,
    survivorId: 20,
    duplicateId: 99,
    removedPlanDuplicates: 1,
    movedPlanLinks: 2,
    movedSetLogs: 3,
  });
  assert.ok(calls.some(call => call.sql.startsWith('UPDATE set_logs')));
  assert.ok(calls.some(call => call.sql === 'DELETE FROM exercises WHERE id = $1'));
  assert.ok(calls.some(call => call.sql === 'COMMIT'));
});

test('does nothing after the duplicate has already been merged', async () => {
  const { db, calls } = createDb([survivor]);
  const result = await mergeLegExtensionDuplicate(db);
  assert.equal(result.merged, false);
  assert.ok(calls.some(call => call.sql === 'COMMIT'));
  assert.ok(!calls.some(call => call.sql.startsWith('UPDATE set_logs')));
});
