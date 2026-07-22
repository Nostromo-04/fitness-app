const express = require('express');
const router = express.Router();
const telegramAuthController = require('../controllers/telegramAuthController');
const { authenticate } = require('../middleware/auth');

// Единственная точка входа: сервер проверяет подпись Telegram initData.
router.post('/telegram', telegramAuthController.authenticate);
router.get('/me', authenticate, telegramAuthController.me);

// Старые маршруты закрыты намеренно: они позволяли подставить чужой Telegram/User ID.
router.get('/telegram/:telegramId', telegramAuthController.deprecated);
router.post('/telegram/link', telegramAuthController.deprecated);

module.exports = router;
