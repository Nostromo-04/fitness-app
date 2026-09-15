require('dotenv').config();

const db = require('../config/database');
const exercises = require('../data/selected-leg-exercises.json');
const apply = process.argv.includes('--apply');

async function main() {
  const client = await db.pool.connect();
  try {
    const names = exercises.map((exercise) => exercise.name);
    const result = await client.query(
      `SELECT e.id, e.name,
              EXISTS (SELECT 1 FROM day_exercises de WHERE de.exercise_id = e.id) AS used_in_plan,
              EXISTS (SELECT 1 FROM set_logs sl WHERE sl.exercise_id = e.id) AS used_in_log
         FROM exercises e
        WHERE e.muscle_group = $1
          AND e.created_by_coach_id IS NULL
          AND e.name = ANY($2::text[])
        ORDER BY e.id`,
      ['Ноги', names]
    );
    const removable = result.rows.filter((row) => !row.used_in_plan && !row.used_in_log);
    const protectedRows = result.rows.filter((row) => row.used_in_plan || row.used_in_log);
    console.log(`Найдено импортированных упражнений: ${result.rows.length}`);
    console.log(`Можно удалить без потери связей: ${removable.length}`);
    console.log(`Используются в планах или журналах и будут сохранены: ${protectedRows.length}`);
    if (!apply) {
      console.log('Проверка завершена без изменений. Для удаления добавьте --apply.');
      return;
    }
    await client.query('BEGIN');
    if (removable.length > 0) {
      await client.query('DELETE FROM exercises WHERE id = ANY($1::int[])', [removable.map((row) => row.id)]);
    }
    await client.query('COMMIT');
    console.log(`Удалено упражнений: ${removable.length}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
    await db.pool.end();
  }
}
main().catch((error) => {
  console.error('Не удалось выполнить откат:', error.message);
  process.exitCode = 1;
});

