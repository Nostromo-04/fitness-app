import api from './api';

export interface WorkoutSession {
  id: number;
  athlete_id: number;
  plan_id: number;
  day_id: number;
  workout_date: string;
  feedback_emoji?: '👍' | '👎';
  completed_at?: string;
  created_at: string;
}

export interface SetLog {
  id: number;
  session_id: number;
  exercise_id: number;
  exercise_name: string;
  set_number: number;
  reps_done: number;
  weight_done: number;
  is_completed: boolean;
  created_at: string;
}

class AthleteService {
  // Получение всех планов спортсмена
  async getMyPlans(athleteId: number) {
    // TODO: заменить на реальный endpoint, когда он будет
    // Пока используем заглушку - получаем планы тренера
    const response = await api.get(`/workouts/plans/coach/4`);
    return response.data;
  }

  // Получение деталей плана с днями
  async getPlanDetails(planId: number) {
    const response = await api.get(`/workouts/plans/${planId}`);
    return response.data;
  }

  // Начало тренировки
  async startWorkout(athleteId: number, planId: number, dayId: number) {
    try {
      console.log('Начало тренировки:', { athleteId, planId, dayId });
      const response = await api.post('/logs/sessions/start', {
        athlete_id: athleteId,
        plan_id: planId,
        day_id: dayId
      });
      console.log('Ответ сервера:', response.data);
      return response.data;
    } catch (error) {
      console.error('Ошибка при старте тренировки:', error);
      throw error;
    }
  }

  // Получение активной тренировки
  async getActiveWorkout(athleteId: number) {
    const response = await api.get(`/logs/sessions/active/${athleteId}`);
    return response.data;
  }

  // Логирование подхода
  async logSet(sessionId: number, setData: {
    exercise_id: number;
    set_number: number;
    reps_done: number;
    weight_done: number;
    is_completed: boolean;
  }) {
    const response = await api.post(`/logs/sessions/${sessionId}/sets`, setData);
    return response.data;
  }

  // Получение всех подходов тренировки
  async getSessionSets(sessionId: number) {
    const response = await api.get(`/logs/sessions/${sessionId}/sets`);
    return response.data;
  }

  // Завершение тренировки
  async completeWorkout(sessionId: number, feedbackEmoji: '👍' | '👎') {
    const response = await api.put(`/logs/sessions/${sessionId}/complete`, {
      feedback_emoji: feedbackEmoji
    });
    return response.data;
  }

  // Получение календаря тренировок
  async getWorkoutCalendar(athleteId: number, year: number, month: number) {
    const response = await api.get(`/logs/calendar/${athleteId}?year=${year}&month=${month}`);
    return response.data;
  }

  // Получение деталей тренировки по дате
  async getWorkoutByDate(athleteId: number, date: string) {
    const response = await api.get(`/logs/calendar/${athleteId}/date/${date}`);
    return response.data;
  }

  // Получение прогресса по упражнению
  async getExerciseProgress(athleteId: number, exerciseId: number, limit: number = 10) {
    const response = await api.get(`/logs/progress/${athleteId}/exercise/${exerciseId}?limit=${limit}`);
    return response.data;
  }

  // Получение сводки по спортсмену
  async getAthleteSummary(athleteId: number) {
    const response = await api.get(`/logs/summary/${athleteId}`);
    return response.data;
  }
}

export default new AthleteService();