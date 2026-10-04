const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cardio = require('../data/selected-cardio-exercises.json');
const expected = '2331 0684 2141 2138 2311'.split(' ');
test('cardio import creates the group with selected Russian exercises and media', () => {
  assert.deepEqual(cardio.map(e => e.source_id).sort(), expected.sort());
  for (const e of cardio) {
    assert.equal(e.muscle_group, 'Кардио');
    assert.match(e.name, /[А-Яа-яЁё]/);
    assert.ok(e.instruction.length > 100);
    const image = fs.readFileSync(path.join(__dirname, '../../frontend/public', e.image_url));
    const gif = fs.readFileSync(path.join(__dirname, '../../frontend/public', e.video_url));
    assert.equal(image.subarray(0,2).toString('hex'), 'ffd8');
    assert.match(gif.subarray(0,6).toString(), /^GIF8[79]a$/);
  }
});