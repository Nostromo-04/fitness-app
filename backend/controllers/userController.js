const User = require('../models/User');

const userController = {
  // Регистрация нового пользователя (при первом входе)
  async register(req, res) {
    try {
      const userData = req.body;
      
      // Проверяем, не существует ли уже пользователь
      const existingUser = await User.findByTelegramId(userData.telegram_id);
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Пользователь с таким telegram_id уже существует'
        });
      }

      const user = await User.create(userData);
      res.status(201).json({
        status: 'success',
        data: user
      });
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера при регистрации'
      });
    }
  },

  // Получение информации о пользователе по telegram_id
  async getByTelegramId(req, res) {
    try {
      const { telegramId } = req.params;
      const user = await User.findByTelegramId(telegramId);
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'Пользователь не найден'
        });
      }

      res.json({
        status: 'success',
        data: user
      });
    } catch (error) {
      console.error('Ошибка при поиске пользователя:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Получение всех спортсменов тренера
  async getAthletes(req, res) {
    try {
      const { coachId } = req.params;
      const athletes = await User.getAthletesByCoach(coachId);
      
      res.json({
        status: 'success',
        data: athletes
      });
    } catch (error) {
      console.error('Ошибка при получении спортсменов:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Обновление данных пользователя
  async update(req, res) {
    try {
      const { id } = req.params;
      const user = await User.update(id, req.body);
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'Пользователь не найден'
        });
      }

      res.json({
        status: 'success',
        data: user
      });
    } catch (error) {
      console.error('Ошибка при обновлении:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

  // Удаление пользователя
  async delete(req, res) {
    try {
      const { id } = req.params;
      const user = await User.delete(id);
      
      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'Пользователь не найден'
        });
      }

      res.json({
        status: 'success',
        message: 'Пользователь удален'
      });
    } catch (error) {
      console.error('Ошибка при удалении:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  }
};

module.exports = userController;