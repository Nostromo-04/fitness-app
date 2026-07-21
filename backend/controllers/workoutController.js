const db = require('../config/database');
const WorkoutSession = require('../models/WorkoutSession');

const workoutController = {
  // ──────────────────────────────────────────────
  // GET /api/workouts/coach/:coachId/plans
  // Все планы тренера (для счётчика на CoachDashboard)
  // ──────────────────────────────────────────────
  async getCoachPlans(req, res) {
    try {
      const { coachId } = req.params;
      const result = await db.query(
        `SELECT wp.id, wp.name, wp.athlete_id, wp.created_at,
                u.first_name AS athlete_first_name, u.last_name AS athlete_last_name,
                COUNT(wd.id)::int AS days_count
           FROM workout_plans wp
           LEFT JOIN users u ON wp.athlete_id = u.id
           LEFT JOIN workout_days wd ON wd.plan_id = wp.id
          WHERE wp.coach_id = $1
          GROUP BY wp.id, u.id
          ORDER BY wp.created_at DESC`,
        [coachId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('getCoachPlans error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/athlete/:athleteId/plans
  // ТОЛЬКО планы, назначенные этому спортсмену.
  // Новый спортсмен (без планов) получит пустой массив.
  // ──────────────────────────────────────────────
  async getAthletePlans(req, res) {
    try {
      const { athleteId } = req.params;
      const result = await db.query(
        `SELECT wp.id, wp.name, wp.athlete_id, wp.coach_id, wp.created_at,
                COUNT(wd.id)::int AS days_count
           FROM workout_plans wp
           LEFT JOIN workout_days wd ON wd.plan_id = wp.id
          WHERE wp.athlete_id = $1
          GROUP BY wp.id
          ORDER BY wp.created_at DESC`,
        [athleteId]
      );
      res.json({ status: 'success', data: result.rows });
    } catch (error) {
      console.error('getAthletePlans error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/:planId
  // Детали плана со всеми днями и упражнениями
  // ──────────────────────────────────────────────
  async getPlanDetails(req, res) {
    try {
      const { planId } = req.params;
      const planResult = await db.query(
        `SELECT id, name, athlete_id, coach_id, created_at FROM workout_plans WHERE id = $1`,
        [planId]
      );
      if (planResult.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'План не найден' });
      }
      const plan = planResult.rows[0];

      const daysResult = await db.query(
        `SELECT wd.id, wd.day_number,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', wde.id,
                      'exercise_id', wde.exercise_id,
                      'exercise_name', e.name,
                      'muscle_group', e.muscle_group,
                      'sets_count', wde.sets_count,
                      'default_reps', wde.default_reps,
                      'default_weight', wde.default_weight,
                      'order_index', wde.order_index,
                      'image_url', e.image_url,
                      'video_url', e.video_url
                    ) ORDER BY wde.order_index
                  ) FILTER (WHERE wde.id IS NOT NULL),
                  '[]'
                ) AS exercises
           FROM workout_days wd
           LEFT JOIN workout_day_exercises wde ON wde.day_id = wd.id
           LEFT JOIN exercises e ON e.id = wde.exercise_id
          WHERE wd.plan_id = $1
          GROUP BY wd.id
          ORDER BY wd.day_number`,
        [planId]
      );

      res.json({
        status: 'success',
        data: {
          ...plan,
          days: daysResult.rows,
        },
      });
    } catch (error) {
      console.error('getPlanDetails error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // POST /api/workouts/create
  // Тренер создаёт план и сразу назначает спортсмену
  // Body: { name, coach_id, athlete_id, days: [{day_number, exercises}] }
  // ──────────────────────────────────────────────
  async createPlan(req, res) {
    const client = await db.getClient?.() || null;
    try {
      const { name, coach_id, athlete_id, days = [] } = req.body;
      if (!name || !coach_id) {
        return res.status(400).json({ status: 'error', message: 'name и coach_id обязательны' });
      }

      // Если клиент транзакций доступен — используем его, иначе простые запросы
      const query = client
        ? (sql, params) => client.query(sql, params)
        : (sql, params) => db.query(sql, params);

      if (client) await client.query('BEGIN');

      const planResult = await query(
        `INSERT INTO workout_plans (name, coach_id, athlete_id) VALUES ($1, $2, $3) RETURNING id, name, coach_id, athlete_id, created_at`,
        [name.trim(), coach_id, athlete_id || null]
      );
      const plan = planResult.rows[0];

      for (const day of days) {
        const dayResult = await query(
          `INSERT INTO workout_days (plan_id, day_number) VALUES ($1, $2) RETURNING id`,
          [plan.id, day.day_number]
        );
        const dayId = dayResult.rows[0].id;

        for (let i = 0; i < (day.exercises || []).length; i++) {
          const ex = day.exercises[i];
          await query(
            `INSERT INTO workout_day_exercises (day_id, exercise_id, sets_count, default_reps, default_weight, order_index)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [dayId, ex.exercise_id, ex.sets_count || 3, ex.default_reps || 10, ex.default_weight || 0, i]
          );
        }
      }

      if (client) await client.query('COMMIT');

      res.status(201).json({ status: 'success', data: plan });
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.error('createPlan error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    } finally {
      if (client) client.release?.();
    }
  },

  // ──────────────────────────────────────────────
  // PUT /api/workouts/:planId/assign
  // Назначить план спортсмену (или переназначить)
  // Body: { athlete_id }
  // ──────────────────────────────────────────────
  async assignPlan(req, res) {
    try {
      const { planId } = req.params;
      const { athlete_id } = req.body;
      const result = await db.query(
        `UPDATE workout_plans SET athlete_id = $1 WHERE id = $2 RETURNING id, name, athlete_id`,
        [athlete_id, planId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'План не найден' });
      }
      res.json({ status: 'success', data: result.rows[0] });
    } catch (error) {
      console.error('assignPlan error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // POST /api/workouts/start
  // Спортсмен начинает тренировку
  // Body: { athlete_id, plan_id, day_id }
  // ──────────────────────────────────────────────
  async startWorkout(req, res) {
    try {
      const { athlete_id, plan_id, day_id } = req.body;
      if (!athlete_id || !plan_id || !day_id) {
        return res.status(400).json({ status: 'error', message: 'athlete_id, plan_id, day_id обязательны' });
      }

      // Удаляем незавершённые сессии с тем же day_id чтобы не множить "пустые" тренировки
      const existing = await db.query(
        `SELECT id FROM workout_sessions WHERE athlete_id = $1 AND day_id = $2 AND completed_at IS NULL`,
        [athlete_id, day_id]
      );
      for (const row of existing.rows) {
        await WorkoutSession.deleteIncomplete(row.id);
      }

      const session = await WorkoutSession.create({ athlete_id, plan_id, day_id });
      res.status(201).json({ status: 'success', data: session });
    } catch (error) {
      console.error('startWorkout error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // POST /api/workouts/complete/:sessionId
  // Завершить тренировку
  // Body: { feedback_emoji }
  // ──────────────────────────────────────────────
  async completeWorkout(req, res) {
    try {
      const { sessionId } = req.params;
      const { feedback_emoji } = req.body;
      const session = await WorkoutSession.complete(sessionId, feedback_emoji);
      res.json({ status: 'success', data: session });
    } catch (error) {
      console.error('completeWorkout error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/athlete/:athleteId/summary
  // Сводная статистика спортсмена
  // ──────────────────────────────────────────────
  async getAthleteSummary(req, res) {
    try {
      const { athleteId } = req.params;
      const result = await db.query(
        `SELECT
           COUNT(*)::int                                           AS total_workouts,
           COALESCE(SUM(
             (SELECT COUNT(*) FROM set_logs sl
              WHERE sl.session_id = ws.id AND sl.is_completed = true)
           ), 0)::int                                             AS total_sets,
           MAX(ws.workout_date)                                   AS last_workout_date
         FROM workout_sessions ws
         WHERE ws.athlete_id = $1 AND ws.completed_at IS NOT NULL`,
        [athleteId]
      );
      res.json({ status: 'success', data: { summary: result.rows[0] } });
    } catch (error) {
      console.error('getAthleteSummary error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/athlete/:athleteId/progress/:exerciseId
  // История показателей по упражнению
  // ──────────────────────────────────────────────
  async getExerciseProgress(req, res) {
    try {
      const { athleteId, exerciseId } = req.params;
      const limit = parseInt(req.query.limit) || 10;
      const rows = await WorkoutSession.getExerciseProgress(
        parseInt(athleteId),
        parseInt(exerciseId),
        limit
      );
      res.json({ status: 'success', data: { progress: rows } });
    } catch (error) {
      console.error('getExerciseProgress error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/athlete/:athleteId/calendar
  // Тренировки за месяц (для спортсмена)
  // ──────────────────────────────────────────────
  async getAthleteCalendar(req, res) {
    try {
      const { athleteId } = req.params;
      const year  = parseInt(req.query.year)  || new Date().getFullYear();
      const month = parseInt(req.query.month) || new Date().getMonth() + 1;
      const sessions = await WorkoutSession.getAthleteSessions(
        parseInt(athleteId),
        `${year}-${String(month).padStart(2, '0')}-01`,
        `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
      );
      res.json({ status: 'success', data: sessions });
    } catch (error) {
      console.error('getAthleteCalendar error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/coach/:coachId/athlete/:athleteId/calendar
  // Тренировки спортсмена для тренера
  // ──────────────────────────────────────────────
  async getAthleteCalendarForCoach(req, res) {
    try {
      const { athleteId } = req.params;
      const year  = parseInt(req.query.year)  || new Date().getFullYear();
      const month = parseInt(req.query.month) || new Date().getMonth() + 1;
      const sessions = await WorkoutSession.getAthleteSessionsForCoach(
        parseInt(athleteId), year, month
      );
      res.json({ status: 'success', data: sessions });
    } catch (error) {
      console.error('getAthleteCalendarForCoach error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // DELETE /api/workouts/:planId
  // Удалить план
  // ──────────────────────────────────────────────
  async deletePlan(req, res) {
    try {
      const { planId } = req.params;
      await db.query('DELETE FROM workout_plans WHERE id = $1', [planId]);
      res.json({ status: 'success', message: 'План удалён' });
    } catch (error) {
      console.error('deletePlan error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },
};

module.exports = workoutController;
