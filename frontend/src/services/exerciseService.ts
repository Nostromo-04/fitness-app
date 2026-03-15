import api from './api';

export interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  image_url?: string;
  video_url?: string;
  created_by_coach_id: number;
  created_at: string;
}

export interface CreateExerciseData {
  name: string;
  muscle_group: string;
  image_url?: string;
  video_url?: string;
  created_by_coach_id: number;
}

class ExerciseService {
  // Получение всех упражнений
  async getAll(muscleGroup?: string) {
    const url = muscleGroup 
      ? `/exercises?muscleGroup=${encodeURIComponent(muscleGroup)}`
      : '/exercises';
    const response = await api.get(url);
    return response.data;
  }

  // Получение упражнений тренера
  async getByCoachId(coachId: number) {
    const response = await api.get(`/exercises/coach/${coachId}`);
    return response.data;
  }

  // Получение всех групп мышц
  async getMuscleGroups() {
    const response = await api.get('/exercises/muscle-groups');
    return response.data;
  }

  // Создание нового упражнения
  async create(data: CreateExerciseData) {
    const response = await api.post('/exercises', data);
    return response.data;
  }

  // Обновление упражнения
  async update(id: number, data: Partial<CreateExerciseData>) {
    const response = await api.put(`/exercises/${id}`, data);
    return response.data;
  }

  // Удаление упражнения
  async delete(id: number) {
    const response = await api.delete(`/exercises/${id}`);
    return response.data;
  }

  // Поиск упражнений
  async search(query: string) {
    const response = await api.get(`/exercises/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }
}

export default new ExerciseService();