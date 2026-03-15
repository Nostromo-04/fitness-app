const Exercise = require('../models/Exercise');

const exerciseController = {
  // Создание нового упражнения
  async create(req, res) {
    try {
      const exerciseData = req.body;
      
      // Проверка обязательных полей
      if (!exerciseData.name || !exerciseData.muscle_group || !exerciseData.created_by_coach_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Необходимо указать название, группу мышц и ID тренера'
        });
      }

      const exercise = await Exercise.create(exerciseData);
      res.status(201).json({
        status: 'success',
        data: exercise
      });
    } catch (error) {
      console.error('Ошибка при создании упражнения:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера при создании упражнения'
      });
    }
  },

  // Получение всех упражнений (с опциональной фильтрацией по группе мышц)
  async getAll(req, res) {
    try {
      const { muscleGroup } = req.query;
      const exercises = await Exercise.findAll(muscleGroup);
      
      // Получаем список всех групп мышц для фильтрации на фронтенде
      const muscleGroups = await Exercise.getAllMuscleGroups();
      
      res.json({
        status: 'success',
        data: {
          exercises,
          filters: {
            muscleGroups
          }
        }
      });
    } catch (error) {
      console.error('Ошибка при получении упражнений:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение упражнения по ID
  async getById(req, res) {
    try {
      const { id } = req.params;
      const exercise = await Exercise.findById(id);
      
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
      console.error('Ошибка при получении упражнения:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение упражнений конкретного тренера
  async getByCoachId(req, res) {
    try {
      const { coachId } = req.params;
      const exercises = await Exercise.findByCoachId(coachId);
      
      res.json({
        status: 'success',
        data: exercises
      });
    } catch (error) {
      console.error('Ошибка при получении упражнений тренера:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Обновление упражнения
  async update(req, res) {
    try {
      const { id } = req.params;
      
      // Проверяем существование упражнения
      const existingExercise = await Exercise.findById(id);
      if (!existingExercise) {
        return res.status(404).json({
          status: 'error',
          message: 'Упражнение не найдено'
        });
      }

      const exercise = await Exercise.update(id, req.body);
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

  // Удаление упражнения
  async delete(req, res) {
    try {
      const { id } = req.params;
      
      // Проверяем существование упражнения
      const existingExercise = await Exercise.findById(id);
      if (!existingExercise) {
        return res.status(404).json({
          status: 'error',
          message: 'Упражнение не найдено'
        });
      }

      const result = await Exercise.delete(id);
      res.json({
        status: 'success',
        message: 'Упражнение успешно удалено',
        data: result
      });
    } catch (error) {
      console.error('Ошибка при удалении упражнения:', error);
      
      // Если ошибка из-за использования в планах
      if (error.message.includes('используется в планах')) {
        return res.status(400).json({
          status: 'error',
          message: error.message
        });
      }
      
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Поиск упражнений
  async search(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        return res.status(400).json({
          status: 'error',
          message: 'Поисковый запрос должен содержать минимум 2 символа'
        });
      }

      const exercises = await Exercise.search(q);
      res.json({
        status: 'success',
        data: exercises
      });
    } catch (error) {
      console.error('Ошибка при поиске упражнений:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение всех групп мышц
  async getMuscleGroups(req, res) {
    try {
      const muscleGroups = await Exercise.getAllMuscleGroups();
      res.json({
        status: 'success',
        data: muscleGroups
      });
    } catch (error) {
      console.error('Ошибка при получении групп мышц:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  }
};

module.exports = exerciseController;