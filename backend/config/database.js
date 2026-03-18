const { Pool } = require('pg');
require('dotenv').config();

const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Отсутствуют переменные окружения:', missingVars.join(', '));
  console.error('Проверьте файл .env');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Устанавливаем кодировку при каждом подключении
pool.on('connect', (client) => {
  client.query("SET client_encoding = 'UTF8'");
});

// Переопределяем query для гарантии правильной кодировки
const originalQuery = pool.query.bind(pool);
pool.query = async (text, params) => {
  const client = await pool.connect();
  try {
    // Устанавливаем UTF8 перед каждым запросом
    await client.query("SET client_encoding = 'UTF8'");
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Функция для проверки подключения
async function testConnection() {
  const client = await pool.connect();
  try {
    console.log('✅ Успешно подключено к PostgreSQL');
    console.log(`   База данных: ${process.env.DB_NAME}`);
    console.log(`   Хост: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    
    await client.query("SET client_encoding = 'UTF8'");
    
    const encodingResult = await client.query("SHOW client_encoding");
    console.log(`📊 Текущая кодировка клиента: ${encodingResult.rows[0].client_encoding}`);
    
  } catch (err) {
    console.error('❌ Ошибка при проверке подключения:', err.message);
  } finally {
    client.release();
  }
}

testConnection().catch(console.error);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};