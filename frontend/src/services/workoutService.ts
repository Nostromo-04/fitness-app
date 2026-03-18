import api from './api';
import type { WorkoutPlan, WorkoutDay, DayExercise, CreatePlanData, AddExerciseData } from '../types/workout';

class WorkoutService {
  // === ПЛАНЫ ===
  
  // Создание нового плана
  async createPlan(data: CreatePlanData) {
    const response = await api.post('/workouts/plans', data);
    return response.data;
  }

  // Получение всех планов тренера
  async getCoachPlans(coachId: number) {
    const response = await api.get(`/workouts/plans/coach/${coachId}`);
    return response.data;
  }

  // Получение плана с деталями
  async getPlanById(id: number) {
    const response = await api.get(`/workouts/plans/${id}`);
    return response.data;
  }

  // Назначение плана спортсмену
  async assignToAthlete(planId: number, athleteId: number) {
    const response = await api.post(`/workouts/plans/${planId}/assign/${athleteId}`);
    return response.data;
  }

  // Получение спортсменов плана
  async getPlanAthletes(planId: number) {
    const response = await api.get(`/workouts/plans/${planId}/athletes`);
    return response.data;
  }

  // Обновление плана
  async updatePlan(id: number, data: Partial<CreatePlanData>) {
    const response = await api.put(`/workouts/plans/${id}`, data);
    return response.data;
  }

  // Удаление плана
  async deletePlan(id: number) {
    const response = await api.delete(`/workouts/plans/${id}`);
    return response.data;
  }

  // === ДНИ ===

  // Добавление дня в план
  async addDay(planId: number, dayNumber: number) {
    const response = await api.post(`/workouts/plans/${planId}/days`, { day_number: dayNumber });
    return response.data;
  }

  // Получение всех дней плана
  async getPlanDays(planId: number) {
    const response = await api.get(`/workouts/plans/${planId}/days`);
    return response.data;
  }

  // Получение конкретного дня
  async getDayById(dayId: number) {
    const response = await api.get(`/workouts/days/${dayId}`);
    return response.data;
  }

  // Удаление дня
  async deleteDay(dayId: number) {
    const response = await api.delete(`/workouts/days/${dayId}`);
    return response.data;
  }

  // === УПРАЖНЕНИЯ В ДНЕ ===

  // Добавление упражнения в день
  async addExerciseToDay(dayId: number, data: AddExerciseData) {
    const response = await api.post(`/workouts/days/${dayId}/exercises`, data);
    return response.data;
  }

  // Получение упражнений дня
  async getDayExercises(dayId: number) {
    const response = await api.get(`/workouts/days/${dayId}/exercises`);
    return response.data;
  }

  // Обновление упражнения в дне
  async updateDayExercise(id: number, data: Partial<AddExerciseData>) {
    const response = await api.put(`/workouts/day-exercises/${id}`, data);
    return response.data;
  }

  // Удаление упражнения из дня
  async deleteDayExercise(id: number) {
    const response = await api.delete(`/workouts/day-exercises/${id}`);
    return response.data;
  }

  // Изменение порядка упражнений
  async reorderExercises(dayId: number, exercises: { id: number; order_index: number }[]) {
    const response = await api.put(`/workouts/days/${dayId}/exercises/reorder`, { exercises });
    return response.data;
  }
}

export default new WorkoutService();