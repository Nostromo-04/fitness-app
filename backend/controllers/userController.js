const User = require('../models/User');
const db = require('../config/database'); // Добавляем
const iconv = require('iconv-lite'); // Добавляем если используется

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

  // Получение всех пользователей
  async getAllUsers(req, res) {
    try {
      const query = 'SELECT id, telegram_id, role, coach_id, first_name, last_name, phone, created_at FROM users ORDER BY role, first_name';
      const result = await db.query(query);
      
      res.json({
        status: 'success',
        data: result.rows
      });
    } catch (error) {
      console.error('Ошибка при получении пользователей:', error);
      res.status(500).json({
        status: 'error',
        message: 'Ошибка сервера'
      });
    }
  },

// Получение пользователя по ID
async getUserById(req, res) {
  try {
    const { id } = req.params;
    const query = 'SELECT id, telegram_id, role, coach_id, first_name, last_name, phone, created_at FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Пользователь не найден'
      });
    }
    
    res.json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка при получении пользователя:', error);
    res.status(500).json({
      status: 'error',
      message: 'Ошибка сервера'
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

      // Конвертируем имена если они есть
      if (user.first_name) {
        const firstNameBuffer = Buffer.from(user.first_name, 'binary');
        user.first_name = iconv.decode(firstNameBuffer, 'win1251');
      }
      if (user.last_name) {
        const lastNameBuffer = Buffer.from(user.last_name, 'binary');
        user.last_name = iconv.decode(lastNameBuffer, 'win1251');
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

      // Конвертируем имена если они есть
      if (user.first_name) {
        const firstNameBuffer = Buffer.from(user.first_name, 'binary');
        user.first_name = iconv.decode(firstNameBuffer, 'win1251');
      }
      if (user.last_name) {
        const lastNameBuffer = Buffer.from(user.last_name, 'binary');
        user.last_name = iconv.decode(lastNameBuffer, 'win1251');
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