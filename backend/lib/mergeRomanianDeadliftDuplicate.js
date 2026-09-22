async function mergeRomanianDeadliftDuplicate(db) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT id, name, muscle_group, image_url, video_url, instruction FROM exercises WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [[40, 78]]);
    const survivor = rows.find(row => Number(row.id) === 40);
    const duplicate = rows.find(row => Number(row.id) === 78);
    if (!duplicate) {
      await client.query('COMMIT');
      return { merged: false };
    }
    if (!survivor || !['Румынская тяга', 'Румынская тяга со штангой'].includes(survivor.name)
        || duplicate.name !== 'Румынская тяга со штангой'
        || survivor.muscle_group !== 'Ноги' || duplicate.muscle_group !== 'Ноги') {
      throw new Error('Exercise IDs 40/78 do not match the expected Romanian deadlift');
    }
    await client.query(`CREATE TABLE IF NOT EXISTS exercise_merge_backups (
      merge_key TEXT PRIMARY KEY, snapshot JSONB NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    await client.query(`INSERT INTO exercise_merge_backups (merge_key, snapshot)
      SELECT 'romanian-deadlift-78-into-40', jsonb_build_object(
        'exercises', (SELECT jsonb_agg(to_jsonb(e)) FROM exercises e WHERE id IN (40, 78)),
        'day_exercises', (SELECT jsonb_agg(to_jsonb(d)) FROM day_exercises d WHERE exercise_id IN (40, 78)),
        'set_logs', (SELECT jsonb_agg(to_jsonb(s)) FROM set_logs s WHERE exercise_id IN (40, 78))
      ) ON CONFLICT (merge_key) DO NOTHING`);
    const plans = await client.query('UPDATE day_exercises SET exercise_id = $1 WHERE exercise_id = $2', [40, 78]);
    const logs = await client.query('UPDATE set_logs SET exercise_id = $1 WHERE exercise_id = $2', [40, 78]);
    await client.query(`UPDATE exercises SET name = $2, image_url = $3, video_url = $4, instruction = $5 WHERE id = $1`,
      [40, duplicate.name, duplicate.image_url || survivor.image_url, duplicate.video_url || survivor.video_url, duplicate.instruction || survivor.instruction]);
    await client.query('DELETE FROM exercises WHERE id = $1', [78]);
    await client.query('COMMIT');
    return { merged: true, movedPlanLinks: plans.rowCount, movedSetLogs: logs.rowCount };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
module.exports = { mergeRomanianDeadliftDuplicate };
