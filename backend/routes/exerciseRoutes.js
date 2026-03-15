const express = require('express');
const router = express.Router();
const exerciseController = require('../controllers/exerciseController');

// Базовые маршруты для упражнений
router.post('/', exerciseController.create);
router.get('/', exerciseController.getAll);
router.get('/search', exerciseController.search);
router.get('/muscle-groups', exerciseController.getMuscleGroups);

// Маршруты для конкретного тренера
router.get('/coach/:coachId', exerciseController.getByCoachId);

// Маршруты для конкретного упражнения
router.get('/:id', exerciseController.getById);
router.put('/:id', exerciseController.update);
router.delete('/:id', exerciseController.delete);

module.exports = router;