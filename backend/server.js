const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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

app.use('/api/users', userRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/athletes', athleteRoutes);

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

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    database: 'connected',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
