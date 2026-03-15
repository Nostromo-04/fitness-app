const db = require('./config/database');

async function resetData() {
  try {
    console.log('🚀 Начинаем пересоздание данных...');
    
    // Очищаем таблицы
    await db.query('DELETE FROM exercises');
    await db.query('DELETE FROM users');
    console.log('✅ Таблицы очищены');
    
    // Создаем тренера
    const coachResult = await db.query(
      `INSERT INTO users (telegram_id, role, first_name, last_name) 
       VALUES ($1, 'coach', $2, $3) RETURNING id`,
      [123456789, 'Иван', 'Петров']
    );
    const coachId = coachResult.rows[0].id;
    console.log(`✅ Создан тренер с ID: ${coachId}`);
    
    // Создаем упражнения
    const exercises = [
      ['Жим штанги лежа', 'Грудь', 'https://example.com/bench.jpg', 'https://youtube.com/watch?v=123'],
      ['Приседания со штангой', 'Ноги', 'https://example.com/squat.jpg', 'https://youtube.com/watch?v=456'],
      ['Тяга верхнего блока', 'Спина', 'https://example.com/lat.jpg', 'https://youtube.com/watch?v=789']
    ];
    
    for (const [name, group, img, vid] of exercises) {
      await db.query(
        `INSERT INTO exercises (name, muscle_group, image_url, video_url, created_by_coach_id) 
         VALUES ($1, $2, $3, $4, $5)`,
        [name, group, img, vid, coachId]
      );
      console.log(`✅ Добавлено упражнение: ${name}`);
    }
    
    // Проверяем результат
    const check = await db.query('SELECT name FROM exercises');
    console.log('\n📊 Данные в базе:');
    check.rows.forEach(row => console.log(`   - ${row.name}`));
    
    console.log('\n🎉 Все данные успешно пересозданы!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await db.pool.end();
  }
}

resetData();