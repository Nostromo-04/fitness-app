const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');
const { requireRole, requireCoachParam } = require('../middleware/auth');

// Базовые маршруты для упражнений
router.post('/', requireRole('coach'), exerciseController.create);
router.get('/', exerciseController.getAll);
router.get('/search', exerciseController.search);
router.get('/muscle-groups', exerciseController.getMuscleGroups);

// Маршруты для конкретного тренера
router.get('/coach/:coachId', requireRole('coach'), requireCoachParam(), exerciseController.getByCoachId);

// Маршруты для конкретного упражнения
router.get('/:id', exerciseController.getById);
router.put('/:id', requireRole('coach'), exerciseController.update);
router.delete('/:id', requireRole('coach'), exerciseController.delete);

module.exports = router;
