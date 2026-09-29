const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const shoulders = require('../data/selected-shoulder-exercises.json');
const expected = '0041 0075 0120 0123 0162 0192 0203 2137 0310 0378 2317 0584 0602 2318 0747 0765 0834'.split(' ');
test('shoulder import matches the 17 selected IDs with Russian text and valid media', () => {
  assert.deepEqual(shoulders.map(e => e.source_id).sort(), expected.sort());
  assert.equal(new Set(shoulders.map(e => e.name)).size, 17);
  for (const e of shoulders) {
    assert.equal(e.muscle_group, 'Плечи');
    assert.match(e.name, /[А-Яа-яЁё]/);
    assert.ok(e.instruction.length > 100);
    const image = fs.readFileSync(path.join(__dirname, '../../frontend/public', e.image_url));
    const gif = fs.readFileSync(path.join(__dirname, '../../frontend/public', e.video_url));
    assert.equal(image.subarray(0,2).toString('hex'), 'ffd8');
    assert.match(gif.subarray(0,6).toString(), /^GIF8[79]a$/);
  }
});