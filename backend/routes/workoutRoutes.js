const express = require('express');
const router = express.Router();
const workoutController = require('../controllers/workoutController');
const { requireRole, requireCoachParam, requireAthleteAccess, requirePlanAccess, requireSessionAccess, requireOwnedResource } = require('../middleware/auth');

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
router.get('/plans/coach/:coachId', requireRole('coach'), requireCoachParam(), workoutController.getCoachPlans);
// CoachDashboard (наш вариант) → /workouts/coach/:coachId/plans
router.get('/coach/:coachId/plans', requireRole('coach'), requireCoachParam(), workoutController.getCoachPlans);

// ── Планы спортсмена ──────────────────────────────────────────
// AthleteDashboard → /workouts/athlete/:athleteId/plans
router.get('/athlete/:athleteId/plans', requireAthleteAccess(), workoutController.getAthletePlans);

// ── Статистика и прогресс спортсмена ─────────────────────────
router.get('/athlete/:athleteId/summary', requireAthleteAccess(), workoutController.getAthleteSummary);
router.get('/athlete/:athleteId/progress/:exerciseId', requireAthleteAccess(), workoutController.getExerciseProgress);
router.get('/athlete/:athleteId/calendar', requireAthleteAccess(), workoutController.getAthleteCalendar);
router.get('/coach/:coachId/athlete/:athleteId/calendar', requireRole('coach'), requireCoachParam(), requireAthleteAccess(), workoutController.getAthleteCalendarForCoach);

// ── Создать план ──────────────────────────────────────────────
// workoutService.createPlan → POST /workouts/plans
router.post('/plans', requireRole('coach'), workoutController.createPlan);
// наш вариант
router.post('/create', requireRole('coach'), workoutController.createPlan);

// ── Назначить план спортсмену ─────────────────────────────────
// workoutService.assignToAthlete → POST /workouts/plans/:planId/assign/:athleteId
router.post('/plans/:planId/assign/:athleteId', requireRole('coach'), requirePlanAccess({ write: true }), requireAthleteAccess(), workoutController.assignPlan);
// наш вариант
router.put('/plans/:planId/assign', requireRole('coach'), requirePlanAccess({ write: true }), requireAthleteAccess(), workoutController.assignPlan);
router.put('/:planId/assign', requireRole('coach'), requirePlanAccess({ write: true }), requireAthleteAccess(), workoutController.assignPlan);

// ── Детали плана ──────────────────────────────────────────────
// athleteService.getPlanDetails → GET /workouts/plans/:planId
// workoutService.getPlanById    → GET /workouts/plans/:planId
// (специфичные маршруты /plans/coach/... и /plans/... уже выше)
router.get('/plans/:planId', requirePlanAccess(), workoutController.getPlanDetails);
// обратная совместимость
router.get('/:planId', requirePlanAccess(), workoutController.getPlanDetails);

// ── Обновить / удалить план ───────────────────────────────────
router.put('/plans/:planId', requireRole('coach'), requirePlanAccess({ write: true }), workoutController.updatePlan);
router.delete('/plans/:planId', requireRole('coach'), requirePlanAccess({ write: true }), workoutController.deletePlan);
router.delete('/:planId', requireRole('coach'), requirePlanAccess({ write: true }), workoutController.deletePlan);

// ── Дни плана ────────────────────────────────────────────────
// workoutService.addDay        → POST /workouts/plans/:planId/days
// workoutService.getPlanDays   → GET  /workouts/plans/:planId/days
router.post('/plans/:planId/days', requireRole('coach'), requirePlanAccess({ write: true }), workoutController.addDay);
router.get('/plans/:planId/days', requirePlanAccess(), workoutController.getPlanDays);

// workoutService.getDayById    → GET    /workouts/days/:dayId
// workoutService.deleteDay     → DELETE /workouts/days/:dayId
router.get('/days/:dayId', requireOwnedResource('day', 'dayId'), workoutController.getDayById);
router.delete('/days/:dayId', requireRole('coach'), requireOwnedResource('day', 'dayId'), workoutController.deleteDay);

// ── Упражнения в дне ─────────────────────────────────────────
// workoutService.addExerciseToDay  → POST /workouts/days/:dayId/exercises
// workoutService.getDayExercises   → GET  /workouts/days/:dayId/exercises
// workoutService.reorderExercises  → PUT  /workouts/days/:dayId/exercises/reorder
router.post('/days/:dayId/exercises', requireRole('coach'), requireOwnedResource('day', 'dayId'), workoutController.addExerciseToDay);
router.get('/days/:dayId/exercises', requireOwnedResource('day', 'dayId'), workoutController.getDayExercises);
router.put('/days/:dayId/exercises/reorder', requireRole('coach'), requireOwnedResource('day', 'dayId'), workoutController.reorderExercises);

// workoutService.updateDayExercise → PUT    /workouts/day-exercises/:id
// workoutService.deleteDayExercise → DELETE /workouts/day-exercises/:id
router.put('/day-exercises/:id', requireRole('coach'), requireOwnedResource('dayExercise', 'id'), workoutController.updateDayExercise);
router.delete('/day-exercises/:id', requireRole('coach'), requireOwnedResource('dayExercise', 'id'), workoutController.deleteDayExercise);

// ── Тренировочные сессии ──────────────────────────────────────
router.post('/start', requireRole('athlete'), requireAthleteAccess(), workoutController.startWorkout);
router.post('/complete/:sessionId', requireSessionAccess(), workoutController.completeWorkout);

module.exports = router;
