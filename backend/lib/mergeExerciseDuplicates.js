const DUPLICATE_GROUPS = [[1, 45], [29, 68], [4, 49], [12, 167], [16, 31, 133, 139], [10, 132]];
async function mergeExerciseDuplicates(db, groups = DUPLICATE_GROUPS) {
  const client = await db.pool.connect(); const merged = [];
  try { await client.query('BEGIN');
    for (const group of groups) { const survivorId = Math.min(...group);
      const result = await client.query('SELECT id, image_url, video_url, instruction FROM exercises WHERE id = ANY($1::int[]) ORDER BY id FOR UPDATE', [group]);
      const rowsById = new Map(result.rows.map(row => [Number(row.id), row]));
      if (!rowsById.has(survivorId)) continue;
      for (const duplicateId of group.filter(id => id !== survivorId)) { if (!rowsById.has(duplicateId)) continue;
        const duplicate = rowsById.get(duplicateId);
        if (survivorId === 10 && duplicateId === 132) {
          await client.query('UPDATE exercises SET image_url = $2, video_url = $3, instruction = $4 WHERE id = $1', [10, duplicate.image_url, duplicate.video_url, duplicate.instruction]);
        }
        const removedPlanDuplicates = await client.query('DELETE FROM day_exercises duplicate USING day_exercises survivor WHERE duplicate.exercise_id = $2 AND survivor.exercise_id = $1 AND duplicate.day_id = survivor.day_id', [survivorId, duplicateId]);
        const movedPlanLinks = await client.query('UPDATE day_exercises SET exercise_id = $1 WHERE exercise_id = $2', [survivorId, duplicateId]);
        const movedSetLogs = await client.query('UPDATE set_logs SET exercise_id = $1 WHERE exercise_id = $2', [survivorId, duplicateId]);
        await client.query('DELETE FROM exercises WHERE id = $1', [duplicateId]);
        merged.push({ survivorId, duplicateId, removedPlanDuplicates: removedPlanDuplicates.rowCount, movedPlanLinks: movedPlanLinks.rowCount, movedSetLogs: movedSetLogs.rowCount });
      }
    } await client.query('COMMIT'); return { merged };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
module.exports = { DUPLICATE_GROUPS, mergeExerciseDuplicates };