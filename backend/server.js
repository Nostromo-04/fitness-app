const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Настройка CORS
app.use(cors());

// Middleware для JSON
app.use(express.json());

// Простой middleware для установки правильной кодировки
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// Подключаем маршруты
const userRoutes = require('./routes/userRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const logRoutes = require('./routes/logRoutes');

app.use('/api/users', userRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/logs', logRoutes);

// Базовые маршруты
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Fitness App API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      users: '/api/users',
      exercises: '/api/exercises',
      workouts: '/api/workouts',
      logs: '/api/logs'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Test endpoints:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://localhost:${PORT}/health`);
  console.log(`   - http://localhost:${PORT}/api/users`);
  console.log(`   - http://localhost:${PORT}/api/exercises`);
  console.log(`   - http://localhost:${PORT}/api/workouts`);
  console.log(`   - http://localhost:${PORT}/api/logs`);
});