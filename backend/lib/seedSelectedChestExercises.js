const chestExercises = require('../data/selected-chest-exercises.json');
const legExercises = require('../data/selected-leg-exercises.json');
const armExercises = require('../data/selected-arm-exercises.json');
const backExercises = require('../data/selected-back-exercises.json');
const shoulderExercises = require('../data/selected-shoulder-exercises.json');
const cardioExercises = require('../data/selected-cardio-exercises.json');
const waistExercises = require('../data/selected-waist-exercises.json');

async function seedSelectedChestExercises(db) {
  if (!Array.isArray(chestExercises) || chestExercises.length !== 30) {
    throw new Error('Expected exactly 30 selected chest exercises');
  }
  if (!Array.isArray(legExercises) || legExercises.length !== 50) {
    throw new Error('Expected exactly 50 selected leg exercises');
  }
  if (!Array.isArray(armExercises) || armExercises.length !== 47) {
    throw new Error('Expected exactly 47 selected arm exercises');
  }
  if (!Array.isArray(backExercises) || backExercises.length !== 33) {
    throw new Error('Expected exactly 33 selected back exercises');
  }
  if (!Array.isArray(shoulderExercises) || shoulderExercises.length !== 17) {
    throw new Error('Expected exactly 17 selected shoulder exercises');
  }
  if (!Array.isArray(cardioExercises) || cardioExercises.length !== 5) {
    throw new Error('Expected exactly 5 selected cardio exercises');
  }
  if (!Array.isArray(waistExercises) || waistExercises.length !== 8) {
    throw new Error('Expected exactly 8 selected waist exercises');
  }
  const exercises = [...chestExercises, ...legExercises, ...armExercises, ...backExercises, ...shoulderExercises, ...cardioExercises, ...waistExercises];

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

