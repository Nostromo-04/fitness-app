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

const { mergeRomanianDeadliftDuplicate } = require('../lib/mergeRomanianDeadliftDuplicate');
const romanianRows = [
  { id: 40, name: 'Румынская тяга', muscle_group: 'Ноги' },
  { id: 78, name: 'Румынская тяга со штангой', muscle_group: 'Ноги', image_url: '/image.jpg', video_url: '/animation.gif', instruction: 'Technique' },
];
test('Romanian merge backs up data before moving every plan and log reference', async () => {
  const { db, calls } = createDb(romanianRows);
  const result = await mergeRomanianDeadliftDuplicate(db);
  assert.equal(result.merged, true);
  const backup = calls.findIndex(c => c.sql.startsWith('INSERT INTO exercise_merge_backups'));
  const move = calls.findIndex(c => c.sql.startsWith('UPDATE day_exercises'));
  assert.ok(backup >= 0 && backup < move);
  assert.deepEqual(calls[move].params, [40, 78]);
  assert.deepEqual(calls.find(c => c.sql.startsWith('UPDATE set_logs')).params, [40, 78]);
  assert.ok(!calls.some(c => c.sql.startsWith('DELETE FROM day_exercises')));
  assert.deepEqual(calls.find(c => c.sql.startsWith('UPDATE exercises')).params, [40, romanianRows[1].name, '/image.jpg', '/animation.gif', 'Technique']);
  assert.deepEqual(calls.find(c => c.sql.startsWith('DELETE FROM exercises')).params, [78]);
});
test('Romanian merge is safe to run again', async () => {
  const { db, calls } = createDb([romanianRows[0]]);
  assert.equal((await mergeRomanianDeadliftDuplicate(db)).merged, false);
  assert.ok(!calls.some(c => /^(UPDATE|DELETE)/.test(c.sql)));
});
test('Romanian merge rejects unexpected identity without deleting data', async () => {
  const { db, calls } = createDb([romanianRows[0], { ...romanianRows[1], name: 'Different exercise' }]);
  await assert.rejects(mergeRomanianDeadliftDuplicate(db), /do not match/);
  assert.ok(calls.some(c => c.sql === 'ROLLBACK'));
  assert.ok(!calls.some(c => /^(UPDATE|DELETE)/.test(c.sql)));
});
test('Romanian merge rolls back if history cannot be moved', async () => {
  const { db, calls } = createDb(romanianRows);
  const client = await db.pool.connect();
  const query = client.query.bind(client);
  client.query = async (sql, params) => {
    if (sql.startsWith('UPDATE set_logs')) throw new Error('history failure');
    return query(sql, params);
  };
  await assert.rejects(mergeRomanianDeadliftDuplicate(db), /history failure/);
  assert.ok(calls.some(c => c.sql === 'ROLLBACK'));
  assert.ok(!calls.some(c => c.sql.startsWith('DELETE FROM exercises')));
});
