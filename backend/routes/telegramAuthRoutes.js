const express = require('express');
const router = express.Router();
const telegramAuthController = require('../controllers/telegramAuthController');

// GET /api/auth/telegram/:telegramId — найти пользователя по Telegram ID
router.get('/telegram/:telegramId', telegramAuthController.findByTelegramId);

// POST /api/auth/telegram/link — привязать Telegram ID к существующему пользователю
router.post('/telegram/link', telegramAuthController.linkTelegramId);

module.exports = router;
