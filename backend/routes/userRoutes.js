const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { requireRole, requireCoachParam, requireAthleteAccess } = require('../middleware/auth');

// ВАЖНО: маршрут /coach/:id/athletes должен быть объявлен ДО /:id,
// иначе "coach" будет интерпретирован как id пользователя.
router.get('/coach/:coachId/athletes', requireRole('coach'), requireCoachParam(), userController.getCoachAthletes);

router.get('/', requireRole('admin'), userController.getAllUsers);
router.get('/:athleteId', requireAthleteAccess(), userController.getUserById);
router.put('/:athleteId', requireAthleteAccess(), userController.updateUser);

module.exports = router;
