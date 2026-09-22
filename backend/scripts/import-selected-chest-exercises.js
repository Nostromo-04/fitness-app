const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const apply = process.argv.includes('--apply');
const dataPath = path.join(__dirname, '..', 'data', 'selected-chest-exercises.json');

async function run() {
  const exercises = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  if (!Array.isArray(exercises) || exercises.length !== 30) throw new Error('Expected exactly 30 selected exercises');
  for (const exercise of exercises) {
    for (const field of ['name', 'muscle_group', 'image_url', 'video_url', 'instruction']) {
      if (!exercise[field]) throw new Error('Missing ' + field + ' for ' + (exercise.source_id || exercise.name));
    }
    const imagePath = path.join(__dirname, '..', '..', 'frontend', 'public', exercise.image_url);
    const gifPath = path.join(__dirname, '..', '..', 'frontend', 'public', exercise.video_url);
    if (!fs.existsSync(imagePath) || !fs.existsSync(gifPath)) throw new Error('Media file missing for ' + exercise.name);
  }

  const client = await db.pool.connect();
  const report = { mode: apply ? 'apply' : 'dry-run', inserted: [], skipped: [] };
  try {
    await client.query('BEGIN');
    for (const exercise of exercises) {
      const existing = await client.query('SELECT id, name FROM exercises WHERE lower(name) = lower($1) AND muscle_group = $2 LIMIT 1', [exercise.name, exercise.muscle_group]);
      if (existing.rows[0]) { report.skipped.push({ source_id: exercise.source_id, id: existing.rows[0].id, name: exercise.name }); continue; }
      if (!apply) { report.inserted.push({ source_id: exercise.source_id, name: exercise.name }); continue; }
      const result = await client.query('INSERT INTO exercises (name, muscle_group, image_url, video_url, instruction, created_by_coach_id) VALUES ($1, $2, $3, $4, $5, NULL) RETURNING id, name', [exercise.name, exercise.muscle_group, exercise.image_url, exercise.video_url, exercise.instruction]);
      report.inserted.push({ source_id: exercise.source_id, id: result.rows[0].id, name: exercise.name });
    }
    if (apply) await client.query('COMMIT'); else await client.query('ROLLBACK');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await db.pool.end(); }
}
run().catch(error => { console.error(error.message); process.exit(1); });
