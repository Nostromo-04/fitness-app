const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Регистрация нового пользователя
router.post('/register', userController.register);

// Получение пользователя по telegram_id
router.get('/telegram/:telegramId', userController.getByTelegramId);

// Получение всех спортсменов тренера
router.get('/coach/:coachId/athletes', userController.getAthletes);

// Обновление данных пользователя
router.put('/:id', userController.update);

// Удаление пользователя
router.delete('/:id', userController.delete);

module.exports = router;