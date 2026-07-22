const db = require('../config/database');
const WorkoutSession = require('../models/WorkoutSession');

const workoutController = {
  // ──────────────────────────────────────────────
  // GET /api/workouts/coach/:coachId/plans  (и /plans/coach/:coachId)
  // Все планы тренера — возвращает { data: [...] }
  // CoachDashboard: plansRes.data.length
  // CoachAthletePlansPage: response.data || []
  // ──────────────────────────────────────────────
  async getCoachPlans(req, res) {
    try {
      const { coachId } = req.params;
      const result = await db.query(
        `SELECT wp.id, wp.name, wp.coach_id, wp.created_at,
                COUNT(wd.id)::int AS days_count
           FROM workout_plans wp
           LEFT JOIN workout_days wd ON wd.plan_id = wp.id
          WHERE wp.coach_id = $1
          GROUP BY wp.id
          ORDER BY wp.created_at DESC`,
        [coachId]
      );
      // workoutService.getCoachPlans() возвращает response.data (HTTP body).
      // CoachAthletePlansPage: response.data || []
      // CoachDashboard:        plansRes.data.length
      // Оба читают .data — возвращаем { data: [...] }
      res.json({ data: result.rows });
    } catch (error) {
      console.error('getCoachPlans error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/athlete/:athleteId/plans
  // Планы тренера данного спортсмена (фильтр по coach_id).
  // AthleteDashboard: api.get('/workouts/athlete/:id/plans')
  //   → обрабатывает оба формата через raw?.data ?? raw
  // ──────────────────────────────────────────────
  async getAthletePlans(req, res) {
    try {
      const { athleteId } = req.params;

      const userResult = await db.query(
        `SELECT coach_id FROM users WHERE id = $1`,
        [athleteId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
      }

      const coachId = userResult.rows[0].coach_id;

      if (!coachId) {
        return res.json({ status: 'success', data: [] });
      }

      const result = await db.query(
        `SELECT wp.id, wp.name, wp.coach_id, wp.created_at,
                COUNT(wd.id)::int AS days_count
           FROM workout_plans wp
           LEFT JOIN workout_days wd ON wd.plan_id = wp.id
          WHERE wp.coach_id = $1
          GROUP BY wp.id
          ORDER BY wp.created_at DESC`,
        [coachId]
      );

      res.json({ status: 'success', data: result.rows });
    } catch (error) {
      console.error('getAthletePlans error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/:planId
  // Детали плана с днями и упражнениями.
  // AthleteWorkoutPage / AthletePlanPage:
  //   response.data.days → тело = { id, name, days: [...] } напрямую
  // ──────────────────────────────────────────────
  async getPlanDetails(req, res) {
    try {
      const { planId } = req.params;
      const planResult = await db.query(
        `SELECT id, name, coach_id, created_at FROM workout_plans WHERE id = $1`,
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
                      'id',             de.id,
                      'exercise_id',    de.exercise_id,
                      'exercise_name',  e.name,
                      'muscle_group',   e.muscle_group,
                      'sets_count',     de.sets_count,
                      'default_reps',   de.default_reps,
                      'default_weight', de.default_weight,
                      'order_index',    de.order_index,
                      'image_url',      e.image_url,
                      'video_url',      e.video_url
                    ) ORDER BY de.order_index
                  ) FILTER (WHERE de.id IS NOT NULL),
                  '[]'
                ) AS exercises
           FROM workout_days wd
           LEFT JOIN day_exercises de ON de.day_id = wd.id
           LEFT JOIN exercises   e  ON e.id = de.exercise_id
          WHERE wd.plan_id = $1
          GROUP BY wd.id
          ORDER BY wd.day_number`,
        [planId]
      );

      // athleteService.getPlanDetails() возвращает response.data (HTTP body).
      // AthletePlanPage затем читает: response.data.days
      // Поэтому HTTP body = { data: { ...plan, days } }
      res.json({ data: { ...plan, days: daysResult.rows } });
    } catch (error) {
      console.error('getPlanDetails error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // POST /api/workouts/create
  // Тренер создаёт план.
  // Body: { name, coach_id, days: [{day_number, exercises}] }
  // ──────────────────────────────────────────────
  async createPlan(req, res) {
    try {
      const { name, days = [] } = req.body;
      const coach_id = req.user.id;
      if (!name) {
        return res.status(400).json({ status: 'error', message: 'name обязателен' });
      }

      const planResult = await db.query(
        `INSERT INTO workout_plans (name, coach_id) VALUES ($1, $2)
         RETURNING id, name, coach_id, created_at`,
        [name.trim(), coach_id]
      );
      const plan = planResult.rows[0];

      for (const day of days) {
        const dayResult = await db.query(
          `INSERT INTO workout_days (plan_id, day_number) VALUES ($1, $2) RETURNING id`,
          [plan.id, day.day_number]
        );
        const dayId = dayResult.rows[0].id;

        for (let i = 0; i < (day.exercises || []).length; i++) {
          const ex = day.exercises[i];
          await db.query(
            `INSERT INTO day_exercises
               (day_id, exercise_id, sets_count, default_reps, default_weight, order_index)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [dayId, ex.exercise_id, ex.sets_count || 3, ex.default_reps || 10, ex.default_weight || 0, i]
          );
        }
      }

      res.status(201).json(plan);
    } catch (error) {
      console.error('createPlan error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // PUT /api/workouts/:planId/assign
  // Назначить план спортсмену (если athlete_id добавят в схему)
  // ──────────────────────────────────────────────
  async assignPlan(req, res) {
    try {
      const { planId } = req.params;
      const { athlete_id } = req.body;
      const columns = await db.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_name = 'workout_plans' AND column_name = 'athlete_id'`
      );
      if (columns.rows.length > 0) {
        const result = await db.query(
          `UPDATE workout_plans SET athlete_id = $1 WHERE id = $2 RETURNING id, name`,
          [athlete_id, planId]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ status: 'error', message: 'План не найден' });
        }
        return res.json(result.rows[0]);
      }
      res.json({ id: planId });
    } catch (error) {
      console.error('assignPlan error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // POST /api/workouts/start
  // Спортсмен начинает тренировку.
  // AthleteWorkoutPage: sessionResponse.data.id
  //   → тело = { id, athlete_id, plan_id, day_id, ... } напрямую
  // ──────────────────────────────────────────────
  async startWorkout(req, res) {
    try {
      const { athlete_id, plan_id, day_id } = req.body;
      if (!athlete_id || !plan_id || !day_id) {
        return res.status(400).json({ status: 'error', message: 'athlete_id, plan_id, day_id обязательны' });
      }

      // Удаляем незавершённые сессии с тем же day_id
      const existing = await db.query(
        `SELECT id FROM workout_sessions
          WHERE athlete_id = $1 AND day_id = $2 AND completed_at IS NULL`,
        [athlete_id, day_id]
      );
      for (const row of existing.rows) {
        await WorkoutSession.deleteIncomplete(row.id);
      }

      const session = await WorkoutSession.create({ athlete_id, plan_id, day_id });
      // БЕЗ обёртки — фронтенд читает sessionResponse.data.id
      res.status(201).json(session);
    } catch (error) {
      console.error('startWorkout error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // POST /api/workouts/complete/:sessionId
  // Завершить тренировку — тело = сессия напрямую
  // ──────────────────────────────────────────────
  async completeWorkout(req, res) {
    try {
      const { sessionId } = req.params;
      const { feedback_emoji } = req.body;
      const session = await WorkoutSession.complete(sessionId, feedback_emoji);
      res.json(session);
    } catch (error) {
      console.error('completeWorkout error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/athlete/:athleteId/summary
  // CoachDashboard: s.data.summary.total_workouts
  //   → тело = { summary: { total_workouts, total_sets, last_workout_date } }
  // ──────────────────────────────────────────────
  async getAthleteSummary(req, res) {
    try {
      const { athleteId } = req.params;
      const result = await db.query(
        `SELECT
           COUNT(*)::int  AS total_workouts,
           COALESCE(SUM(
             (SELECT COUNT(*) FROM set_logs sl
              WHERE sl.session_id = ws.id AND sl.is_completed = true)
           ), 0)::int     AS total_sets,
           MAX(ws.workout_date) AS last_workout_date
         FROM workout_sessions ws
         WHERE ws.athlete_id = $1 AND ws.completed_at IS NOT NULL`,
        [athleteId]
      );
      res.json({ summary: result.rows[0] });
    } catch (error) {
      console.error('getAthleteSummary error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/athlete/:athleteId/progress/:exerciseId
  // AthleteWorkoutPage: response?.data?.progress
  //   → тело = { progress: [...] } напрямую
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
      res.json({ progress: rows });
    } catch (error) {
      console.error('getExerciseProgress error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/athlete/:athleteId/calendar
  // Тренировки спортсмена за месяц — массив напрямую
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
      res.json(sessions);
    } catch (error) {
      console.error('getAthleteCalendar error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/coach/:coachId/athlete/:athleteId/calendar
  // Тренировки спортсмена для тренера — массив напрямую
  // ──────────────────────────────────────────────
  async getAthleteCalendarForCoach(req, res) {
    try {
      const { athleteId } = req.params;
      const year  = parseInt(req.query.year)  || new Date().getFullYear();
      const month = parseInt(req.query.month) || new Date().getMonth() + 1;
      const sessions = await WorkoutSession.getAthleteSessionsForCoach(
        parseInt(athleteId), year, month
      );
      res.json(sessions);
    } catch (error) {
      console.error('getAthleteCalendarForCoach error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // DELETE /api/workouts/plans/:planId  (и /:planId)
  // ──────────────────────────────────────────────
  async deletePlan(req, res) {
    try {
      const { planId } = req.params;
      await db.query('DELETE FROM workout_plans WHERE id = $1', [planId]);
      res.json({ message: 'План удалён' });
    } catch (error) {
      console.error('deletePlan error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // PUT /api/workouts/plans/:planId
  // workoutService.updatePlan → { name }
  // ──────────────────────────────────────────────
  async updatePlan(req, res) {
    try {
      const { planId } = req.params;
      const { name } = req.body;
      const result = await db.query(
        `UPDATE workout_plans SET name = $1 WHERE id = $2
         RETURNING id, name, coach_id, created_at`,
        [name, planId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'План не найден' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('updatePlan error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // POST /api/workouts/plans/:planId/days
  // workoutService.addDay → { day_number }
  // ──────────────────────────────────────────────
  async addDay(req, res) {
    try {
      const { planId } = req.params;
      const { day_number } = req.body;
      const result = await db.query(
        `INSERT INTO workout_days (plan_id, day_number) VALUES ($1, $2)
         RETURNING id, plan_id, day_number`,
        [planId, day_number]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('addDay error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/plans/:planId/days
  // workoutService.getPlanDays
  // ──────────────────────────────────────────────
  async getPlanDays(req, res) {
    try {
      const { planId } = req.params;
      const result = await db.query(
        `SELECT wd.id, wd.plan_id, wd.day_number,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id',             de.id,
                      'exercise_id',    de.exercise_id,
                      'exercise_name',  e.name,
                      'muscle_group',   e.muscle_group,
                      'sets_count',     de.sets_count,
                      'default_reps',   de.default_reps,
                      'default_weight', de.default_weight,
                      'order_index',    de.order_index
                    ) ORDER BY de.order_index
                  ) FILTER (WHERE de.id IS NOT NULL),
                  '[]'
                ) AS exercises
           FROM workout_days wd
           LEFT JOIN day_exercises de ON de.day_id = wd.id
           LEFT JOIN exercises     e  ON e.id = de.exercise_id
          WHERE wd.plan_id = $1
          GROUP BY wd.id
          ORDER BY wd.day_number`,
        [planId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('getPlanDays error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/days/:dayId
  // workoutService.getDayById
  // ──────────────────────────────────────────────
  async getDayById(req, res) {
    try {
      const { dayId } = req.params;
      const result = await db.query(
        `SELECT wd.id, wd.plan_id, wd.day_number,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id',             de.id,
                      'exercise_id',    de.exercise_id,
                      'exercise_name',  e.name,
                      'muscle_group',   e.muscle_group,
                      'sets_count',     de.sets_count,
                      'default_reps',   de.default_reps,
                      'default_weight', de.default_weight,
                      'order_index',    de.order_index,
                      'image_url',      e.image_url,
                      'video_url',      e.video_url
                    ) ORDER BY de.order_index
                  ) FILTER (WHERE de.id IS NOT NULL),
                  '[]'
                ) AS exercises
           FROM workout_days wd
           LEFT JOIN day_exercises de ON de.day_id = wd.id
           LEFT JOIN exercises     e  ON e.id = de.exercise_id
          WHERE wd.id = $1
          GROUP BY wd.id`,
        [dayId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'День не найден' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('getDayById error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // DELETE /api/workouts/days/:dayId
  // workoutService.deleteDay
  // ──────────────────────────────────────────────
  async deleteDay(req, res) {
    try {
      const { dayId } = req.params;
      await db.query('DELETE FROM workout_days WHERE id = $1', [dayId]);
      res.json({ message: 'День удалён' });
    } catch (error) {
      console.error('deleteDay error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // POST /api/workouts/days/:dayId/exercises
  // workoutService.addExerciseToDay
  // Body: { exercise_id, sets_count, default_reps, default_weight }
  // ──────────────────────────────────────────────
  async addExerciseToDay(req, res) {
    try {
      const { dayId } = req.params;
      const { exercise_id, sets_count = 3, default_reps = 10, default_weight = 0 } = req.body;

      const countResult = await db.query(
        'SELECT COUNT(*) AS cnt FROM day_exercises WHERE day_id = $1',
        [dayId]
      );
      const orderIndex = parseInt(countResult.rows[0].cnt);

      const result = await db.query(
        `INSERT INTO day_exercises
           (day_id, exercise_id, sets_count, default_reps, default_weight, order_index)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, day_id, exercise_id, sets_count, default_reps, default_weight, order_index`,
        [dayId, exercise_id, sets_count, default_reps, default_weight ?? 0, orderIndex]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('addExerciseToDay error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // GET /api/workouts/days/:dayId/exercises
  // workoutService.getDayExercises
  // ──────────────────────────────────────────────
  async getDayExercises(req, res) {
    try {
      const { dayId } = req.params;
      const result = await db.query(
        `SELECT de.id, de.day_id, de.exercise_id,
                e.name AS exercise_name, e.muscle_group, e.image_url, e.video_url,
                de.sets_count, de.default_reps, de.default_weight, de.order_index
           FROM day_exercises de
           JOIN exercises e ON e.id = de.exercise_id
          WHERE de.day_id = $1
          ORDER BY de.order_index`,
        [dayId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('getDayExercises error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // PUT /api/workouts/day-exercises/:id
  // workoutService.updateDayExercise
  // ──────────────────────────────────────────────
  async updateDayExercise(req, res) {
    try {
      const { id } = req.params;
      const { sets_count, default_reps, default_weight } = req.body;
      const result = await db.query(
        `UPDATE day_exercises
            SET sets_count     = COALESCE($1, sets_count),
                default_reps   = COALESCE($2, default_reps),
                default_weight = COALESCE($3, default_weight)
          WHERE id = $4
          RETURNING id, day_id, exercise_id, sets_count, default_reps, default_weight, order_index`,
        [sets_count, default_reps, default_weight, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ status: 'error', message: 'Упражнение не найдено' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('updateDayExercise error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // DELETE /api/workouts/day-exercises/:id
  // workoutService.deleteDayExercise
  // ──────────────────────────────────────────────
  async deleteDayExercise(req, res) {
    try {
      const { id } = req.params;
      await db.query('DELETE FROM day_exercises WHERE id = $1', [id]);
      res.json({ message: 'Упражнение удалено' });
    } catch (error) {
      console.error('deleteDayExercise error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },

  // ──────────────────────────────────────────────
  // PUT /api/workouts/days/:dayId/exercises/reorder
  // workoutService.reorderExercises
  // Body: { exercises: [{ id, order_index }] }
  // ──────────────────────────────────────────────
  async reorderExercises(req, res) {
    try {
      const { exercises } = req.body;
      if (!Array.isArray(exercises)) {
        return res.status(400).json({ status: 'error', message: 'exercises должен быть массивом' });
      }
      for (const ex of exercises) {
        await db.query(
          'UPDATE day_exercises SET order_index = $1 WHERE id = $2',
          [ex.order_index, ex.id]
        );
      }
      res.json({ message: 'Порядок обновлён' });
    } catch (error) {
      console.error('reorderExercises error:', error);
      res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
    }
  },
};

module.exports = workoutController;
