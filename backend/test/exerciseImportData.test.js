const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'backend', 'data', 'selected-chest-exercises.json'), 'utf8'));
const legData = JSON.parse(fs.readFileSync(path.join(root, 'backend', 'data', 'selected-leg-exercises.json'), 'utf8'));

test('selected chest import contains 30 complete Russian exercises and media files', () => {
  assert.equal(data.length, 30);
  assert.equal(new Set(data.map(item => item.source_id)).size, 30);
  for (const item of data) {
    assert.equal(item.muscle_group, 'Грудь');
    assert.ok(item.name.length > 3);
    assert.ok(item.instruction.length > 30);
    assert.ok(fs.existsSync(path.join(root, 'frontend', 'public', item.image_url)));
    assert.ok(fs.existsSync(path.join(root, 'frontend', 'public', item.video_url)));
  }
});
test('selected leg import contains 50 complete Russian exercises and media files', () => {
  assert.equal(legData.length, 50);
  assert.equal(new Set(legData.map(item => item.source_id)).size, 50);
  for (const item of legData) {
    assert.equal(item.muscle_group, 'Ноги');
    assert.ok(item.name.length > 3);
    assert.ok(item.instruction.length > 30);
    assert.ok(fs.existsSync(path.join(root, 'frontend', 'public', item.image_url)));
    assert.ok(fs.existsSync(path.join(root, 'frontend', 'public', item.video_url)));
  }
});
