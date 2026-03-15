const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');

// === Маршруты для планов ===
router.post('/plans', workoutController.createPlan);
router.get('/plans/coach/:coachId', workoutController.getCoachPlans);
router.get('/plans/:id', workoutController.getPlanById);
router.put('/plans/:id', workoutController.updatePlan);
router.delete('/plans/:id', workoutController.deletePlan);

// Назначение плана спортсмену
router.post('/plans/:planId/assign/:athleteId', workoutController.assignToAthlete);
router.get('/plans/:planId/athletes', workoutController.getPlanAthletes);

// === Маршруты для дней ===
router.post('/plans/:planId/days', workoutController.addDay);
router.get('/plans/:planId/days', workoutController.getPlanDays);
router.get('/days/:id', workoutController.getDayById);
router.delete('/days/:id', workoutController.deleteDay);

// === Маршруты для упражнений в дне ===
router.post('/days/:dayId/exercises', workoutController.addExerciseToDay);
router.get('/days/:dayId/exercises', workoutController.getDayExercises);
router.put('/day-exercises/:id', workoutController.updateDayExercise);
router.delete('/day-exercises/:id', workoutController.deleteDayExercise);
router.put('/days/:dayId/exercises/reorder', workoutController.reorderExercises);

module.exports = router;