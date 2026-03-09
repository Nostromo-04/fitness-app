const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Разрешаем кросс-доменные запросы
app.use(express.json()); // Парсим JSON тела запросов

// Базовая проверка API
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Fitness App API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

// Проверка здоровья сервера
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Test endpoints:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://localhost:${PORT}/health`);
});