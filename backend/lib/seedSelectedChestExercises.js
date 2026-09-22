const chestExercises = require('../data/selected-chest-exercises.json');
const legExercises = require('../data/selected-leg-exercises.json');
const armExercises = require('../data/selected-arm-exercises.json');

async function seedSelectedChestExercises(db) {
  if (!Array.isArray(chestExercises) || chestExercises.length !== 28) {
    throw new Error('Expected exactly 28 selected chest exercises');
  }
  if (!Array.isArray(legExercises) || legExercises.length !== 50) {
    throw new Error('Expected exactly 50 selected leg exercises');
  }
  if (!Array.isArray(armExercises) || armExercises.length !== 47) {
    throw new Error('Expected exactly 47 selected arm exercises');
  }
  const exercises = [...chestExercises, ...legExercises, ...armExercises];

  const client = await db.pool.connect();
  let inserted = 0;
  let skipped = 0;

  try {
    await client.query('BEGIN');
    for (const exercise of exercises) {
      const existing = await client.query(
        'SELECT id FROM exercises WHERE lower(name) = lower($1) AND muscle_group = $2 LIMIT 1',
        [exercise.name, exercise.muscle_group]
      );
      if (existing.rows[0]) {
        skipped += 1;
        continue;
      }
      await client.query(
        `INSERT INTO exercises
           (name, muscle_group, image_url, video_url, instruction, created_by_coach_id)
         VALUES ($1, $2, $3, $4, $5, NULL)`,
        [exercise.name, exercise.muscle_group, exercise.image_url, exercise.video_url, exercise.instruction]
      );
      inserted += 1;
    }
    await client.query('COMMIT');
    return { inserted, skipped };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { seedSelectedChestExercises };

