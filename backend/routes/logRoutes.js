const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');

// === Управление тренировочными сессиями ===
router.post('/sessions/start', logController.startWorkout);
router.put('/sessions/:sessionId/complete', logController.completeWorkout);
router.get('/sessions/active/:athleteId', logController.getActiveWorkout);
router.get('/sessions/:sessionId', logController.getWorkoutDetails);

// === Логирование подходов ===
router.post('/sessions/:sessionId/sets', logController.logSet);
router.get('/sessions/:sessionId/sets', logController.getSessionSets);
router.get('/sessions/:sessionId/exercises/:exerciseId/sets', logController.getExerciseSets);
router.delete('/sets/:setId', logController.deleteSet);

// === Календарь и статистика ===
router.get('/calendar/:athleteId', logController.getWorkoutCalendar);
router.get('/calendar/:athleteId/date/:date', logController.getWorkoutByDate);
router.get('/progress/:athleteId/exercise/:exerciseId', logController.getExerciseProgress);
router.get('/summary/:athleteId', logController.getAthleteSummary);

module.exports = router;