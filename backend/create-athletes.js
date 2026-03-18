const db = require('./config/database');

async function createAthletes() {
  try {
    const athletes = [
      { telegram_id: 111111111, first_name: 'Алексей', last_name: 'Сидоров' },
      { telegram_id: 222222222, first_name: 'Мария', last_name: 'Иванова' },
      { telegram_id: 333333333, first_name: 'Дмитрий', last_name: 'Петров' }
    ];

    for (const athlete of athletes) {
      await db.query(
        `INSERT INTO users (telegram_id, role, coach_id, first_name, last_name) 
         VALUES ($1, 'athlete', 4, $2, $3)`,
        [athlete.telegram_id, athlete.first_name, athlete.last_name]
      );
      console.log(`✅ Создан спортсмен: ${athlete.first_name} ${athlete.last_name}`);
    }
    
    console.log('🎉 Все спортсмены созданы!');
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await db.pool.end();
  }
}

createAthletes();