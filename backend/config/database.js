const { Pool } = require('pg');
require('dotenv').config();

// Определяем, запущено ли приложение на Railway
const isRailway = !!process.env.RAILWAY_ENVIRONMENT;

// Настройки подключения
let poolConfig;

if (isRailway && process.env.DATABASE_URL) {
  // Railway - используем DATABASE_URL
  console.log('🔧 Running on Railway, using DATABASE_URL');
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  };
} else {
  // Локальная разработка
  console.log('🔧 Running locally');
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'fitness_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

console.log('📊 Connection config:', {
  isRailway,
  hasDatabaseUrl: !!process.env.DATABASE_URL,
  host: poolConfig.host || 'using DATABASE_URL',
});

const pool = new Pool(poolConfig);

// Устанавливаем кодировку при каждом подключении
pool.on('connect', (client) => {
  client.query("SET client_encoding = 'UTF8'");
});

// Асинхронная функция для проверки подключения
async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Успешно подключено к PostgreSQL');
    
    if (isRailway) {
      console.log(`   База данных: Railway PostgreSQL`);
    } else {
      console.log(`   База данных: ${poolConfig.database}`);
      console.log(`   Хост: ${poolConfig.host}:${poolConfig.port}`);
    }
    
    await client.query("SET client_encoding = 'UTF8'");
    
    const encodingResult = await client.query("SHOW client_encoding");
    console.log(`📊 Текущая кодировка клиента: ${encodingResult.rows[0].client_encoding}`);
    
  } catch (err) {
    console.error('❌ Ошибка при проверке подключения:', err.message);
    console.error('   Убедитесь, что база данных создана и переменные окружения настроены');
  } finally {
    if (client) client.release();
  }
}

// Запускаем проверку подключения, но не блокируем запуск сервера
testConnection().catch(console.error);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};