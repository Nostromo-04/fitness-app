const WorkoutSession = require('../models/WorkoutSession');
const SetLog = require('../models/SetLog');
const db = require('../config/database'); // Этого импорта не хватало!

const logController = {
  // === УПРАВЛЕНИЕ ТРЕНИРОВОЧНЫМИ СЕССИЯМИ ===
  
  // Начало тренировки (спортсмен)
async startWorkout(req, res) {
  try {
    const { athlete_id, plan_id, day_id } = req.body;
    
    console.log('Получен запрос на старт тренировки:', { athlete_id, plan_id, day_id });
    
    // Проверяем, есть ли активная тренировка
    const activeSession = await WorkoutSession.getActiveSession(athlete_id);
    
    if (activeSession) {
      console.log('Найдена активная тренировка:', activeSession);
      
      // Если это тот же день - возвращаем существующую сессию
      if (activeSession.plan_id === plan_id && activeSession.day_id === day_id) {
        console.log('Возвращаем существующую сессию');
        return res.status(200).json({
          status: 'success',
          data: activeSession,
          message: 'Продолжаем существующую тренировку'
        });
      }
      
      // Если другой день - завершаем старую и создаем новую
      console.log('Завершаем старую тренировку и создаем новую');
      await WorkoutSession.complete(activeSession.id, null);
    }

    const session = await WorkoutSession.create({ athlete_id, plan_id, day_id });
    console.log('Создана новая сессия:', session);
    
    res.status(201).json({
      status: 'success',
      data: session
    });
  } catch (error) {
    console.error('Ошибка при начале тренировки:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка сервера'
    });
  }
},

  // Завершение тренировки (спортсмен)
async completeWorkout(req, res) {
  try {
    const { sessionId } = req.params;
    const { feedback_emoji } = req.body;
    
    // Проверяем, что эмодзи передан
    if (!feedback_emoji || !['👍', '👎'].includes(feedback_emoji)) {
      return res.status(400).json({
        status: 'error',
        message: 'Необходимо выбрать эмодзи'
      });
    }

    const session = await WorkoutSession.complete(sessionId, feedback_emoji);
    
    res.json({
      status: 'success',
      data: session
    });
  } catch (error) {
    console.error('Ошибка при завершении тренировки:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка сервера'
    });
  }
},
  // Получение активной тренировки
  async getActiveWorkout(req, res) {
    try {
      const { athleteId } = req.params;
      const session = await WorkoutSession.getActiveSession(athleteId);
      
      res.json({
        status: 'success',
        data: session || null
      });
    } catch (error) {
      console.error('Ошибка при получении активной тренировки:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // === ЛОГИРОВАНИЕ ПОДХОДОВ ===
  
  // Логирование подхода
  async logSet(req, res) {
    try {
      const { sessionId } = req.params;
      const setData = req.body;
      
      const log = await SetLog.logSet({
        session_id: parseInt(sessionId), // Добавил parseInt
        ...setData
      });
      
      res.status(201).json({
        status: 'success',
        data: log
      });
    } catch (error) {
      console.error('Ошибка при логировании подхода:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение всех подходов тренировки
  async getSessionSets(req, res) {
    try {
      const { sessionId } = req.params;
      const sets = await SetLog.getSessionSets(parseInt(sessionId)); // Добавил parseInt
      
      res.json({
        status: 'success',
        data: sets
      });
    } catch (error) {
      console.error('Ошибка при получении подходов:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение подходов конкретного упражнения в тренировке
  async getExerciseSets(req, res) {
    try {
      const { sessionId, exerciseId } = req.params;
      const sets = await SetLog.getExerciseSets(
        parseInt(sessionId), 
        parseInt(exerciseId)
      );
      
      res.json({
        status: 'success',
        data: sets
      });
    } catch (error) {
      console.error('Ошибка при получении подходов упражнения:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Удаление подхода
  async deleteSet(req, res) {
    try {
      const { setId } = req.params;
      const result = await SetLog.deleteSet(parseInt(setId)); // Добавил parseInt
      
      if (!result) {
        return res.status(404).json({
          status: 'error',
          message: 'Подход не найден'
        });
      }

      res.json({
        status: 'success',
        message: 'Подход удален'
      });
    } catch (error) {
      console.error('Ошибка при удалении подхода:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // === КАЛЕНДАРЬ И СТАТИСТИКА ===
  
  // Получение календаря тренировок спортсмена
  async getWorkoutCalendar(req, res) {
    try {
      const { athleteId } = req.params;
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({
          status: 'error',
          message: 'Необходимо указать год и месяц'
        });
      }

      const sessions = await WorkoutSession.getAthleteSessionsForCoach(
        parseInt(athleteId), // Добавил parseInt
        parseInt(year), 
        parseInt(month)
      );
      
      // Форматируем для календаря
      const calendar = {};
      sessions.forEach(s => {
        const day = new Date(s.workout_date).getDate();
        calendar[day] = {
          emoji: s.feedback_emoji,
          sessions: s.sessions
        };
      });

      res.json({
        status: 'success',
        data: {
          year,
          month,
          calendar
        }
      });
    } catch (error) {
      console.error('Ошибка при получении календаря:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение деталей тренировки по дате (упрощенная версия)
async getWorkoutByDate(req, res) {
  try {
    const { athleteId, date } = req.params;
    
    // Сначала найдем сессию за эту дату
    const sessionQuery = `
      SELECT 
        ws.id,
        ws.plan_id,
        ws.day_id,
        ws.feedback_emoji,
        ws.completed_at,
        wp.name as plan_name,
        wd.day_number
      FROM workout_sessions ws
      JOIN workout_plans wp ON ws.plan_id = wp.id
      JOIN workout_days wd ON ws.day_id = wd.id
      WHERE ws.athlete_id = $1 
        AND DATE(ws.workout_date) = $2
        AND ws.completed_at IS NOT NULL
      LIMIT 1
    `;
    
    const sessionResult = await db.query(sessionQuery, [parseInt(athleteId), date]);
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Тренировка не найдена'
      });
    }
    
    const session = sessionResult.rows[0];
    
    // Теперь получим все подходы для этой сессии
    const setsQuery = `
      SELECT 
        sl.exercise_id,
        e.name as exercise_name,
        e.muscle_group,
        sl.set_number,
        sl.reps_done,
        sl.weight_done,
        sl.is_completed
      FROM set_logs sl
      JOIN exercises e ON sl.exercise_id = e.id
      WHERE sl.session_id = $1
      ORDER BY e.name, sl.set_number
    `;
    
    const setsResult = await db.query(setsQuery, [session.id]);
    
    // Группируем подходы по упражнениям
    const exercises = {};
    setsResult.rows.forEach(set => {
      if (!exercises[set.exercise_id]) {
        exercises[set.exercise_id] = {
          exercise_id: set.exercise_id,
          exercise_name: set.exercise_name,
          muscle_group: set.muscle_group,
          sets: []
        };
      }
      exercises[set.exercise_id].sets.push({
        set_number: set.set_number,
        reps_done: set.reps_done,
        weight_done: set.weight_done,
        is_completed: set.is_completed
      });
    });

    res.json({
      status: 'success',
      data: {
        ...session,
        exercises: Object.values(exercises)
      }
    });
  } catch (error) {
    console.error('Ошибка при получении тренировки по дате:', error);
    console.error(error.stack);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка сервера'
    });
  }
},
  // Получение деталей тренировки по ID
  async getWorkoutDetails(req, res) {
    try {
      const { sessionId } = req.params;
      const details = await WorkoutSession.getSessionDetails(parseInt(sessionId)); // Добавил parseInt
      
      if (!details) {
        return res.status(404).json({
          status: 'error',
          message: 'Тренировка не найдена'
        });
      }

      res.json({
        status: 'success',
        data: details
      });
    } catch (error) {
      console.error('Ошибка при получении деталей тренировки:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение прогресса по упражнению
  async getExerciseProgress(req, res) {
    try {
      const { athleteId, exerciseId } = req.params;
      const { limit } = req.query;
      
      const progress = await WorkoutSession.getExerciseProgress(
        parseInt(athleteId), 
        parseInt(exerciseId), 
        limit ? parseInt(limit) : 10
      );
      
      // Получаем личный рекорд
      const personalBest = await SetLog.getPersonalBest(
        parseInt(athleteId), 
        parseInt(exerciseId)
      );

      res.json({
        status: 'success',
        data: {
          progress,
          personalBest: personalBest || null
        }
      });
    } catch (error) {
      console.error('Ошибка при получении прогресса:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение сводки по спортсмену для тренера
  async getAthleteSummary(req, res) {
    try {
      const { athleteId } = req.params;
      
      // Общая статистика
      const summaryQuery = `
        SELECT 
          COUNT(DISTINCT ws.id) as total_workouts,
          COUNT(DISTINCT DATE(ws.workout_date)) as total_days,
          COALESCE(SUM(CASE WHEN ws.feedback_emoji = '👍' THEN 1 ELSE 0 END), 0) as good_workouts,
          COALESCE(SUM(CASE WHEN ws.feedback_emoji = '👎' THEN 1 ELSE 0 END), 0) as hard_workouts,
          MAX(ws.workout_date) as last_workout
        FROM workout_sessions ws
        WHERE ws.athlete_id = $1 AND ws.completed_at IS NOT NULL
      `;
      
      const summary = await db.query(summaryQuery, [parseInt(athleteId)]);
      
      // Последние 5 тренировок
      const recentQuery = `
        SELECT 
          ws.id,
          ws.workout_date,
          ws.feedback_emoji,
          wp.name as plan_name,
          wd.day_number
        FROM workout_sessions ws
        JOIN workout_plans wp ON ws.plan_id = wp.id
        JOIN workout_days wd ON ws.day_id = wd.id
        WHERE ws.athlete_id = $1 AND ws.completed_at IS NOT NULL
        ORDER BY ws.workout_date DESC
        LIMIT 5
      `;
      
      const recent = await db.query(recentQuery, [parseInt(athleteId)]);

      // Если нет данных, возвращаем пустую статистику
      const summaryData = summary.rows[0] || {
        total_workouts: 0,
        total_days: 0,
        good_workouts: 0,
        hard_workouts: 0,
        last_workout: null
      };

      res.json({
        status: 'success',
        data: {
          summary: summaryData,
          recent: recent.rows || []
        }
      });
    } catch (error) {
      console.error('Ошибка при получении сводки:', error);
      console.error(error.stack); // Добавил стек ошибки для отладки
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  }
};

module.exports = logController;