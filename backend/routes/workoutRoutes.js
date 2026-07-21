const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');

// Планы тренера
router.get('/coach/:coachId/plans', workoutController.getCoachPlans);

// Планы спортсмена — только назначенные ему (фильтр по athlete_id)
router.get('/athlete/:athleteId/plans', workoutController.getAthletePlans);

// Сводная статистика спортсмена
router.get('/athlete/:athleteId/summary', workoutController.getAthleteSummary);

// История прогресса по упражнению
router.get('/athlete/:athleteId/progress/:exerciseId', workoutController.getExerciseProgress);

// Календарь тренировок спортсмена (для самого спортсмена)
router.get('/athlete/:athleteId/calendar', workoutController.getAthleteCalendar);

// Календарь тренировок спортсмена (для тренера)
router.get('/coach/:coachId/athlete/:athleteId/calendar', workoutController.getAthleteCalendarForCoach);

// Создать план
router.post('/create', workoutController.createPlan);

// Назначить план спортсмену
router.put('/:planId/assign', workoutController.assignPlan);

// Детали плана
router.get('/:planId', workoutController.getPlanDetails);

// Начать тренировку
router.post('/start', workoutController.startWorkout);

// Завершить тренировку
router.post('/complete/:sessionId', workoutController.completeWorkout);

// Удалить план
router.delete('/:planId', workoutController.deletePlan);

module.exports = router;
