const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/inviteController');

// Создать инвайт-ссылку (тренер вызывает)
router.post('/coach/:coachId', inviteController.createInvite);

// Проверить токен (фронт вызывает при открытии страницы регистрации)
router.get('/check/:token', inviteController.checkInvite);

// Зарегистрировать спортсмена по инвайту
router.post('/register', inviteController.registerByInvite);

module.exports = router;
