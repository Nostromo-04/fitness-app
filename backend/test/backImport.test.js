const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const back = require('../data/selected-back-exercises.json');
const expected = '0007 0017 0027 0049 0118 0095 0150 0180 0193 1319 0197 0205 0208 0218 0239 0293 0327 0292 1344 0489 0499 0571 0572 0573 3200 0579 0581 1349 0604 0651 0746 0761 2987'.split(' ');
test('back import matches the 33 selected IDs with Russian text and valid media', () => {
  assert.deepEqual(back.map(e => e.source_id).sort(), expected.sort());
  assert.equal(new Set(back.map(e => e.name)).size, 33);
  for (const e of back) {
    assert.equal(e.muscle_group, 'Спина');
    assert.match(e.name, /[А-Яа-яЁё]/);
    assert.ok(e.instruction.length > 100);
    const image = fs.readFileSync(path.join(__dirname, '../../frontend/public', e.image_url));
    const gif = fs.readFileSync(path.join(__dirname, '../../frontend/public', e.video_url));
    assert.equal(image.subarray(0, 2).toString('hex'), 'ffd8');
    assert.match(gif.subarray(0, 6).toString(), /^GIF8[79]a$/);
  }
});