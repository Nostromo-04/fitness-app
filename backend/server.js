const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const { authenticate } = require('./middleware/auth');

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') return callback(null, true);
    return callback(new Error('Origin is not allowed'));
  },
}));
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

const userRoutes = require('./routes/userRoutes');
const exerciseRoutes = require('./routes/exerciseRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const logRoutes = require('./routes/logRoutes');
const inviteRoutes = require('./routes/inviteRoutes');
const athleteRoutes = require('./routes/athleteRoutes');
const coachRoutes = require('./routes/coachRoutes');
const telegramAuthRoutes = require('./routes/telegramAuthRoutes');

app.use('/api/auth', telegramAuthRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/exercises', authenticate, exerciseRoutes);
app.use('/api/workouts', authenticate, workoutRoutes);
app.use('/api/logs', authenticate, logRoutes);
app.use('/api/athletes', authenticate, athleteRoutes);
app.use('/api/coaches', authenticate, coachRoutes);

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
      logs: '/api/logs',
      invites: '/api/invites',
    },
  });
});

app.get('/health', async (req, res) => {
  try {
    await require('./config/database').query('SELECT 1');
    res.json({ status: 'healthy', uptime: process.uptime(), database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected', timestamp: new Date().toISOString() });
  }
});

async function startServer() {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.SESSION_SECRET) {
    throw new Error('TELEGRAM_BOT_TOKEN and SESSION_SECRET must be configured');
  }
  await require('./config/database').query(`
    CREATE TABLE IF NOT EXISTS athlete_invites (
      id SERIAL PRIMARY KEY,
      token_hash CHAR(64) UNIQUE NOT NULL,
      coach_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      athlete_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  app.listen(PORT, () => console.log(`🚀 Server is running on port ${PORT}`));
}

startServer().catch(error => {
  console.error('❌ Server startup failed:', error.message);
  process.exit(1);
});
