const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const arms = require('../data/selected-arm-exercises.json');
const { seedSelectedChestExercises } = require('../lib/seedSelectedChestExercises');
const expected = '0019 0986 0998 2407 0030 0031 1720 0070 1399 0139 0140 0868 0165 1722 1723 1636 0194 0201 0200 1724 0285 2403 1646 1647 1648 0294 1731 1657 0313 0315 0333 0351 0372 0389 1677 0402 1748 1627 0446 0450 1615 0592 1451 0607 0636 0751 0814'.split(' ');
test('arm import matches 47 selected IDs with Russian text and valid media', () => {
 assert.deepEqual(arms.map(e => e.source_id).sort(), expected.sort());
 assert.equal(new Set(arms.map(e => e.name)).size, 47);
 for (const e of arms) {
  assert.equal(e.muscle_group, 'Руки');
  assert.match(e.name, /[А-Яа-яЁё]/);
  assert.ok(e.instruction.length > 100);
  const image = fs.readFileSync(path.join(__dirname, '../../frontend/public', e.image_url));
  const gif = fs.readFileSync(path.join(__dirname, '../../frontend/public', e.video_url));
  assert.equal(image.subarray(0,2).toString('hex'), 'ffd8');
  assert.match(gif.subarray(0,6).toString(), /^GIF8[79]a$/);
 }
});
test('selected seed skips existing exercises on repeat runs', async () => {
 const existing = new Set();
 const client = { async query(sql, params) {
  if (sql.startsWith('SELECT id FROM exercises')) return {rows: existing.has(params.join('|').toLowerCase()) ? [{id:1}] : []};
  if (sql.trim().startsWith('INSERT INTO exercises')) existing.add(params.slice(0,2).join('|').toLowerCase());
  return {rows: []};
 }, release() {} };
 const db = {pool: {connect: async () => client}};
 const all = [...require('../data/selected-chest-exercises.json'), ...require('../data/selected-leg-exercises.json'), ...arms];
 const unique = new Set(all.map(e => [e.name, e.muscle_group].join('|').toLowerCase())).size;
 assert.equal((await seedSelectedChestExercises(db)).inserted, unique);
 for (const e of arms) assert.ok(existing.has([e.name, e.muscle_group].join('|').toLowerCase()));
 assert.deepEqual(await seedSelectedChestExercises(db), {inserted:0, skipped:all.length});
});
