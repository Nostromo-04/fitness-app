const db = require('./config/database');

async function initializeDatabase() {
  console.log('🚀 Начинаем инициализацию базы данных...');
  
  try {
    // SQL для создания таблиц
    const schemaSQL = `
      -- Таблица пользователей
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('coach', 'athlete')),
        coach_id INTEGER REFERENCES users(id),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Таблица упражнений
      CREATE TABLE IF NOT EXISTS exercises (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        muscle_group VARCHAR(50) NOT NULL,
        image_url TEXT,
        video_url TEXT,
        created_by_coach_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Таблица планов тренировок
      CREATE TABLE IF NOT EXISTS workout_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        coach_id INTEGER REFERENCES users(id) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Таблица назначений планов спортсменам
      CREATE TABLE IF NOT EXISTS plan_assignments (
        id SERIAL PRIMARY KEY,
        plan_id INTEGER REFERENCES workout_plans(id) ON DELETE CASCADE,
        athlete_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(plan_id, athlete_id)
      );

      -- Таблица дней тренировок
      CREATE TABLE IF NOT EXISTS workout_days (
        id SERIAL PRIMARY KEY,
        plan_id INTEGER REFERENCES workout_plans(id) ON DELETE CASCADE,
        day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 10),
        UNIQUE(plan_id, day_number)
      );

      -- Таблица упражнений в дне тренировки
      CREATE TABLE IF NOT EXISTS day_exercises (
        id SERIAL PRIMARY KEY,
        day_id INTEGER REFERENCES workout_days(id) ON DELETE CASCADE,
        exercise_id INTEGER REFERENCES exercises(id),
        sets_count INTEGER NOT NULL CHECK (sets_count <= 10),
        default_reps INTEGER NOT NULL,
        default_weight DECIMAL(6,2),
        order_index INTEGER NOT NULL
      );

      -- Таблица выполненных тренировок (сессий)
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id SERIAL PRIMARY KEY,
        athlete_id INTEGER REFERENCES users(id),
        plan_id INTEGER REFERENCES workout_plans(id),
        day_id INTEGER REFERENCES workout_days(id),
        workout_date DATE DEFAULT CURRENT_DATE,
        feedback_emoji VARCHAR(10) CHECK (feedback_emoji IN ('👍', '👎')),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Таблица выполненных подходов
      CREATE TABLE IF NOT EXISTS set_logs (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES workout_sessions(id) ON DELETE CASCADE,
        exercise_id INTEGER REFERENCES exercises(id),
        set_number INTEGER NOT NULL,
        reps_done INTEGER NOT NULL,
        weight_done DECIMAL(6,2),
        is_completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Создаем индексы для ускорения запросов
      CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_users_coach ON users(coach_id);
      CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises(muscle_group);
      CREATE INDEX IF NOT EXISTS idx_plan_assignments_athlete ON plan_assignments(athlete_id);
      CREATE INDEX IF NOT EXISTS idx_workout_sessions_athlete ON workout_sessions(athlete_id, workout_date);
      CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs(session_id);
    `;

    // Выполняем SQL команды
    await db.query(schemaSQL);
    
    console.log('✅ Таблицы успешно созданы');
    
    // Проверяем созданные таблицы
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Созданные таблицы:');
    tables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    // Считаем количество записей в каждой таблице
    console.log('\n📈 Статистика:');
    for (const table of tables.rows) {
      const count = await db.query(`SELECT COUNT(*) FROM ${table.table_name}`);
      console.log(`   ${table.table_name}: ${count.rows[0].count} записей`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при инициализации базы данных:');
    console.error(error.message);
    if (error.code === '42P01') {
      console.error('Проблема с созданием таблиц. Проверьте синтаксис SQL.');
    }
  } finally {
    // Закрываем подключение к базе
    await db.pool.end();
    console.log('\n👋 Соединение с БД закрыто');
  }
}

initializeDatabase();