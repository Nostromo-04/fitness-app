const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// ВАЖНО: маршрут /coach/:id/athletes должен быть объявлен ДО /:id,
// иначе "coach" будет интерпретирован как id пользователя.
router.get('/coach/:coachId/athletes', userController.getCoachAthletes);

router.get('/',     userController.getAllUsers);
router.get('/:id',  userController.getUserById);
router.put('/:id',  userController.updateUser);

module.exports = router;
