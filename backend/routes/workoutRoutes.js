const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');

// ══════════════════════════════════════════════════════════════
// ВАЖНО: порядок маршрутов критичен!
// Специфичные /:segment/... должны стоять ДО /:planId
//
// Фронтенд-сервисы используют два варианта URL:
//   workoutService → /workouts/plans/...   (GitHub repo)
//   CoachDashboard → /workouts/coach/...   (наш контроллер)
// Добавляем оба варианта.
// ══════════════════════════════════════════════════════════════

// ── Планы тренера ────────────────────────────────────────────
// workoutService.getCoachPlans → /workouts/plans/coach/:coachId
router.get('/plans/coach/:coachId', workoutController.getCoachPlans);
// CoachDashboard (наш вариант) → /workouts/coach/:coachId/plans
router.get('/coach/:coachId/plans', workoutController.getCoachPlans);

// ── Планы спортсмена ──────────────────────────────────────────
// AthleteDashboard → /workouts/athlete/:athleteId/plans
router.get('/athlete/:athleteId/plans', workoutController.getAthletePlans);

// ── Статистика и прогресс спортсмена ─────────────────────────
router.get('/athlete/:athleteId/summary',              workoutController.getAthleteSummary);
router.get('/athlete/:athleteId/progress/:exerciseId', workoutController.getExerciseProgress);
router.get('/athlete/:athleteId/calendar',             workoutController.getAthleteCalendar);
router.get('/coach/:coachId/athlete/:athleteId/calendar', workoutController.getAthleteCalendarForCoach);

// ── Создать план ──────────────────────────────────────────────
// workoutService.createPlan → POST /workouts/plans
router.post('/plans', workoutController.createPlan);
// наш вариант
router.post('/create', workoutController.createPlan);

// ── Назначить план спортсмену ─────────────────────────────────
// workoutService.assignToAthlete → POST /workouts/plans/:planId/assign/:athleteId
router.post('/plans/:planId/assign/:athleteId', workoutController.assignPlan);
// наш вариант
router.put('/plans/:planId/assign', workoutController.assignPlan);
router.put('/:planId/assign',       workoutController.assignPlan);

// ── Детали плана ──────────────────────────────────────────────
// athleteService.getPlanDetails → GET /workouts/plans/:planId
// workoutService.getPlanById    → GET /workouts/plans/:planId
// (специфичные маршруты /plans/coach/... и /plans/... уже выше)
router.get('/plans/:planId', workoutController.getPlanDetails);
// обратная совместимость
router.get('/:planId', workoutController.getPlanDetails);

// ── Обновить / удалить план ───────────────────────────────────
router.put('/plans/:planId',    workoutController.updatePlan);
router.delete('/plans/:planId', workoutController.deletePlan);
router.delete('/:planId',       workoutController.deletePlan);

// ── Дни плана ────────────────────────────────────────────────
// workoutService.addDay        → POST /workouts/plans/:planId/days
// workoutService.getPlanDays   → GET  /workouts/plans/:planId/days
router.post('/plans/:planId/days', workoutController.addDay);
router.get('/plans/:planId/days',  workoutController.getPlanDays);

// workoutService.getDayById    → GET    /workouts/days/:dayId
// workoutService.deleteDay     → DELETE /workouts/days/:dayId
router.get('/days/:dayId',    workoutController.getDayById);
router.delete('/days/:dayId', workoutController.deleteDay);

// ── Упражнения в дне ─────────────────────────────────────────
// workoutService.addExerciseToDay  → POST /workouts/days/:dayId/exercises
// workoutService.getDayExercises   → GET  /workouts/days/:dayId/exercises
// workoutService.reorderExercises  → PUT  /workouts/days/:dayId/exercises/reorder
router.post('/days/:dayId/exercises',         workoutController.addExerciseToDay);
router.get('/days/:dayId/exercises',          workoutController.getDayExercises);
router.put('/days/:dayId/exercises/reorder',  workoutController.reorderExercises);

// workoutService.updateDayExercise → PUT    /workouts/day-exercises/:id
// workoutService.deleteDayExercise → DELETE /workouts/day-exercises/:id
router.put('/day-exercises/:id',    workoutController.updateDayExercise);
router.delete('/day-exercises/:id', workoutController.deleteDayExercise);

// ── Тренировочные сессии ──────────────────────────────────────
router.post('/start',               workoutController.startWorkout);
router.post('/complete/:sessionId', workoutController.completeWorkout);

module.exports = router;
