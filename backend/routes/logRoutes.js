const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { requireRole, requireAthleteAccess, requireSessionAccess, requireOwnedResource } = require('../middleware/auth');

// === Управление тренировочными сессиями ===
router.post('/sessions/start', requireRole('athlete'), requireAthleteAccess(), logController.startWorkout);
router.put('/sessions/:sessionId/complete', requireSessionAccess(), logController.completeWorkout);
router.get('/sessions/active/:athleteId', requireAthleteAccess(), logController.getActiveWorkout);
router.get('/sessions/:sessionId', requireSessionAccess(), logController.getWorkoutDetails);

// === Логирование подходов ===
router.post('/sessions/:sessionId/sets', requireSessionAccess(), logController.logSet);
router.get('/sessions/:sessionId/sets', requireSessionAccess(), logController.getSessionSets);
router.get('/sessions/:sessionId/exercises/:exerciseId/sets', requireSessionAccess(), logController.getExerciseSets);
router.delete('/sets/:setId', requireOwnedResource('set', 'setId'), logController.deleteSet);

// === Календарь и статистика ===
router.get('/calendar/:athleteId', requireAthleteAccess(), logController.getWorkoutCalendar);
router.get('/calendar/:athleteId/date/:date', requireAthleteAccess(), logController.getWorkoutByDate);
router.get('/progress/:athleteId/exercise/:exerciseId', requireAthleteAccess(), logController.getExerciseProgress);
router.get('/summary/:athleteId', requireAthleteAccess(), logController.getAthleteSummary);

module.exports = router;
