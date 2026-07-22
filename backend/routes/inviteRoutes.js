const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/inviteController');
const { authenticate, requireRole, requireCoachParam } = require('../middleware/auth');

// Создать инвайт-ссылку (тренер вызывает)
router.post('/coach/:coachId', authenticate, requireRole('coach'), requireCoachParam(), inviteController.createInvite);

// Проверить токен (фронт вызывает при открытии страницы регистрации)
router.get('/check/:token', inviteController.checkInvite);

// Зарегистрировать спортсмена по инвайту
router.post('/register', (_req, res) => res.status(410).json({
  status: 'error',
  message: 'Старая регистрация отключена. Откройте новое приглашение внутри Telegram.',
}));

module.exports = router;
