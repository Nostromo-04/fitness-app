async function mergeLegExtensionDuplicate(db, survivorId = 20, duplicateId = 99) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT id, name, muscle_group, image_url, video_url, instruction
         FROM exercises
        WHERE id = ANY($1::int[])
        ORDER BY id
        FOR UPDATE`,
      [[survivorId, duplicateId]]
    );
    const survivor = result.rows.find(row => Number(row.id) === survivorId);
    const duplicate = result.rows.find(row => Number(row.id) === duplicateId);
    if (!duplicate) {
      await client.query('COMMIT');
      return { merged: false, survivorId, duplicateId };
    }
    if (!survivor) throw new Error(`Exercise ${survivorId} was not found`);
    if (survivor.muscle_group !== 'Ноги' || duplicate.muscle_group !== 'Ноги'
      || duplicate.name !== 'Разгибание ног сидя в тренажёре') {
      throw new Error('Exercise IDs do not match the expected leg-extension duplicate');
    }

    const removedPlanDuplicates = await client.query(
      `DELETE FROM day_exercises duplicate
        USING day_exercises survivor
        WHERE duplicate.exercise_id = $2
          AND survivor.exercise_id = $1
          AND duplicate.day_id = survivor.day_id`,
      [survivorId, duplicateId]
    );
    const movedPlanLinks = await client.query(
      'UPDATE day_exercises SET exercise_id = $1 WHERE exercise_id = $2',
      [survivorId, duplicateId]
    );
    const movedSetLogs = await client.query(
      'UPDATE set_logs SET exercise_id = $1 WHERE exercise_id = $2',
      [survivorId, duplicateId]
    );
    await client.query(
      `UPDATE exercises
          SET name = $2, muscle_group = $3, image_url = $4,
              video_url = $5, instruction = $6
        WHERE id = $1`,
      [survivorId, duplicate.name, duplicate.muscle_group, duplicate.image_url,
        duplicate.video_url, duplicate.instruction]
    );
    await client.query('DELETE FROM exercises WHERE id = $1', [duplicateId]);
    await client.query('COMMIT');
    return {
      merged: true,
      survivorId,
      duplicateId,
      removedPlanDuplicates: removedPlanDuplicates.rowCount,
      movedPlanLinks: movedPlanLinks.rowCount,
      movedSetLogs: movedSetLogs.rowCount,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { mergeLegExtensionDuplicate };
