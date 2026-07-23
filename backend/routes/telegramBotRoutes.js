const express = require('express');
const telegramBotController = require('../controllers/telegramBotController');

const router = express.Router();
router.post('/webhook', telegramBotController.webhook);

module.exports = router;
