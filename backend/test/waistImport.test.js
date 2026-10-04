const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const waist = require('../data/selected-waist-exercises.json');
const expected = '0001 0175 2963 1764 0491 1452 0600 0634'.split(' ');
test('waist import creates selected Russian exercises and valid media', () => {
  assert.deepEqual(waist.map(e => e.source_id).sort(), expected.sort());
  for (const e of waist) {
    assert.equal(e.muscle_group, 'Пресс');
    assert.match(e.name, /[А-Яа-яЁё]/);
    assert.ok(e.instruction.length > 100);
    const image = fs.readFileSync(path.join(__dirname, '../../frontend/public', e.image_url));
    const gif = fs.readFileSync(path.join(__dirname, '../../frontend/public', e.video_url));
    assert.equal(image.subarray(0, 2).toString('hex'), 'ffd8');
    assert.match(gif.subarray(0, 6).toString(), /^GIF8[79]a$/);
  }
});