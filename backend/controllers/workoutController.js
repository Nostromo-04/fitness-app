const WorkoutPlan = require('../models/WorkoutPlan');
const WorkoutDay = require('../models/WorkoutDay');
const DayExercise = require('../models/DayExercise');

const workoutController = {
  // === ПЛАНЫ ТРЕНИРОВОК ===
  
  // Создание нового плана
  async createPlan(req, res) {
    try {
      const { name, coach_id } = req.body;
      
      if (!name || !coach_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Необходимо указать название плана и ID тренера'
        });
      }

      const plan = await WorkoutPlan.create({ name, coach_id });
      res.status(201).json({
        status: 'success',
        data: plan
      });
    } catch (error) {
      console.error('Ошибка при создании плана:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера при создании плана'
      });
    }
  },

  // Получение всех планов тренера
  async getCoachPlans(req, res) {
    try {
      const { coachId } = req.params;
      const plans = await WorkoutPlan.findByCoachId(coachId);
      
      res.json({
        status: 'success',
        data: plans
      });
    } catch (error) {
      console.error('Ошибка при получении планов:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение плана с деталями
  async getPlanById(req, res) {
    try {
      const { id } = req.params;
      const plan = await WorkoutPlan.findByIdWithDetails(id);
      
      if (!plan) {
        return res.status(404).json({
          status: 'error',
          message: 'План не найден'
        });
      }

      res.json({
        status: 'success',
        data: plan
      });
    } catch (error) {
      console.error('Ошибка при получении плана:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Назначение плана спортсмену
  async assignToAthlete(req, res) {
    try {
      const { planId, athleteId } = req.params;
      
      const result = await WorkoutPlan.assignToAthlete(planId, athleteId);
      
      if (!result) {
        return res.status(400).json({
          status: 'error',
          message: 'План уже назначен этому спортсмену'
        });
      }

      res.status(201).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('Ошибка при назначении плана:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение спортсменов, назначенных на план
  async getPlanAthletes(req, res) {
    try {
      const { planId } = req.params;
      const athletes = await WorkoutPlan.getAssignedAthletes(planId);
      
      res.json({
        status: 'success',
        data: athletes
      });
    } catch (error) {
      console.error('Ошибка при получении спортсменов плана:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Обновление плана
  async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const plan = await WorkoutPlan.update(id, req.body);
      
      if (!plan) {
        return res.status(404).json({
          status: 'error',
          message: 'План не найден'
        });
      }

      res.json({
        status: 'success',
        data: plan
      });
    } catch (error) {
      console.error('Ошибка при обновлении плана:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Удаление плана
  async deletePlan(req, res) {
    try {
      const { id } = req.params;
      const result = await WorkoutPlan.delete(id);
      
      if (!result) {
        return res.status(404).json({
          status: 'error',
          message: 'План не найден'
        });
      }

      res.json({
        status: 'success',
        message: 'План успешно удален'
      });
    } catch (error) {
      console.error('Ошибка при удалении плана:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // === ДНИ ТРЕНИРОВОК ===
  
  // Добавление дня в план
  async addDay(req, res) {
    try {
      const { planId } = req.params;
      const { day_number } = req.body;
      
      if (day_number < 1 || day_number > 10) {
        return res.status(400).json({
          status: 'error',
          message: 'Номер дня должен быть от 1 до 10'
        });
      }

      const day = await WorkoutDay.create({
        plan_id: planId,
        day_number
      });

      res.status(201).json({
        status: 'success',
        data: day
      });
    } catch (error) {
      console.error('Ошибка при добавлении дня:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение всех дней плана
  async getPlanDays(req, res) {
    try {
      const { planId } = req.params;
      const days = await WorkoutDay.findByPlanId(planId);
      
      res.json({
        status: 'success',
        data: days
      });
    } catch (error) {
      console.error('Ошибка при получении дней:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение конкретного дня
  async getDayById(req, res) {
    try {
      const { id } = req.params;
      const day = await WorkoutDay.findById(id);
      
      if (!day) {
        return res.status(404).json({
          status: 'error',
          message: 'День не найден'
        });
      }

      res.json({
        status: 'success',
        data: day
      });
    } catch (error) {
      console.error('Ошибка при получении дня:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Удаление дня
  async deleteDay(req, res) {
    try {
      const { id } = req.params;
      const result = await WorkoutDay.delete(id);
      
      if (!result) {
        return res.status(404).json({
          status: 'error',
          message: 'День не найден'
        });
      }

      res.json({
        status: 'success',
        message: 'День успешно удален'
      });
    } catch (error) {
      console.error('Ошибка при удалении дня:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // === УПРАЖНЕНИЯ В ДНЕ ===
  
  // Добавление упражнения в день
  async addExerciseToDay(req, res) {
    try {
      const { dayId } = req.params;
      const { exercise_id, sets_count, default_reps, default_weight, order_index } = req.body;
      
      if (!exercise_id || !sets_count || !default_reps) {
        return res.status(400).json({
          status: 'error',
          message: 'Необходимо указать упражнение, количество подходов и повторений'
        });
      }

      if (sets_count > 10) {
        return res.status(400).json({
          status: 'error',
          message: 'Максимальное количество подходов - 10'
        });
      }

      const dayExercise = await DayExercise.create({
        day_id: dayId,
        exercise_id,
        sets_count,
        default_reps,
        default_weight,
        order_index
      });

      res.status(201).json({
        status: 'success',
        data: dayExercise
      });
    } catch (error) {
      console.error('Ошибка при добавлении упражнения:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение всех упражнений дня
  async getDayExercises(req, res) {
    try {
      const { dayId } = req.params;
      const exercises = await DayExercise.findByDayId(dayId);
      
      res.json({
        status: 'success',
        data: exercises
      });
    } catch (error) {
      console.error('Ошибка при получении упражнений:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Обновление упражнения в дне
  async updateDayExercise(req, res) {
    try {
      const { id } = req.params;
      const exercise = await DayExercise.update(id, req.body);
      
      if (!exercise) {
        return res.status(404).json({
          status: 'error',
          message: 'Упражнение не найдено'
        });
      }

      res.json({
        status: 'success',
        data: exercise
      });
    } catch (error) {
      console.error('Ошибка при обновлении упражнения:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Удаление упражнения из дня
  async deleteDayExercise(req, res) {
    try {
      const { id } = req.params;
      const result = await DayExercise.delete(id);
      
      if (!result) {
        return res.status(404).json({
          status: 'error',
          message: 'Упражнение не найдено'
        });
      }

      res.json({
        status: 'success',
        message: 'Упражнение удалено из дня'
      });
    } catch (error) {
      console.error('Ошибка при удалении упражнения:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Изменение порядка упражнений (drag-and-drop)
  async reorderExercises(req, res) {
    try {
      const { dayId } = req.params;
      const { exercises } = req.body; // массив [{ id, order_index }]
      
      await DayExercise.reorder(dayId, exercises);
      
      res.json({
        status: 'success',
        message: 'Порядок упражнений обновлен'
      });
    } catch (error) {
      console.error('Ошибка при изменении порядка:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  }
};

module.exports = workoutController;