const db = require('../config/database');

class Exercise {
  // Создание нового упражнения
  static async create(exerciseData) {
    const { name, muscle_group, image_url, video_url, created_by_coach_id } = exerciseData;
    
    const query = `
      INSERT INTO exercises (name, muscle_group, image_url, video_url, created_by_coach_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, muscle_group, image_url, video_url, created_by_coach_id, created_at
    `;
    
    const values = [name, muscle_group, image_url || null, video_url || null, created_by_coach_id];
    
    try {
      const result = await db.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Получение всех упражнений (с фильтром по группе мышц опционально)
  static async findAll(muscleGroup = null) {
    let query = `
      SELECT e.*, u.first_name as coach_first_name, u.last_name as coach_last_name
      FROM exercises e
      LEFT JOIN users u ON e.created_by_coach_id = u.id
    `;
    const values = [];
    
    if (muscleGroup) {
      query += ` WHERE e.muscle_group = $1`;
      values.push(muscleGroup);
    }
    
    query += ` ORDER BY e.muscle_group, e.name`;
    
    const result = await db.query(query, values);
    return result.rows;
  }

  // Получение упражнения по ID
  static async findById(id) {
    const query = `
      SELECT e.*, u.first_name as coach_first_name, u.last_name as coach_last_name
      FROM exercises e
      LEFT JOIN users u ON e.created_by_coach_id = u.id
      WHERE e.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Получение упражнений конкретного тренера
  static async findByCoachId(coachId) {
    const query = `
      SELECT * FROM exercises 
      WHERE created_by_coach_id = $1 
      ORDER BY muscle_group, name
    `;
    const result = await db.query(query, [coachId]);
    return result.rows;
  }

  // Получение всех групп мышц (для фильтрации)
  static async getAllMuscleGroups() {
    const query = `
      SELECT DISTINCT muscle_group 
      FROM exercises 
      ORDER BY muscle_group
    `;
    const result = await db.query(query);
    return result.rows.map(row => row.muscle_group);
  }

  // Обновление упражнения
  static async update(id, updateData) {
    const { name, muscle_group, image_url, video_url } = updateData;
    
    const query = `
      UPDATE exercises 
      SET name = COALESCE($1, name),
          muscle_group = COALESCE($2, muscle_group),
          image_url = COALESCE($3, image_url),
          video_url = COALESCE($4, video_url)
      WHERE id = $5
      RETURNING id, name, muscle_group, image_url, video_url, created_by_coach_id, created_at
    `;
    
    const values = [name, muscle_group, image_url, video_url, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Удаление упражнения (с проверкой, не используется ли оно в планах)
  static async delete(id) {
    // Проверяем, используется ли упражнение в каких-либо днях тренировок
    const checkQuery = `
      SELECT COUNT(*) as count 
      FROM day_exercises 
      WHERE exercise_id = $1
    `;
    const checkResult = await db.query(checkQuery, [id]);
    
    if (checkResult.rows[0].count > 0) {
      throw new Error('Невозможно удалить упражнение: оно используется в планах тренировок');
    }
    
    const query = 'DELETE FROM exercises WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Поиск упражнений по названию
  static async search(searchTerm) {
    const query = `
      SELECT * FROM exercises 
      WHERE name ILIKE $1 
      ORDER BY muscle_group, name
    `;
    const result = await db.query(query, [`%${searchTerm}%`]);
    return result.rows;
  }
}

module.exports = Exercise;