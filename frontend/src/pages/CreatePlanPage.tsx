import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Users } from 'lucide-react';
import type { WorkoutDay, DayExercise } from '../types/workout';
import workoutService from '../services/workoutService';
import type { Exercise } from '../services/exerciseService';
import exerciseService from '../services/exerciseService';
import api from '../services/api';
import { ExerciseSelector } from '../components/ExerciseSelector';
import { PlanExerciseItem } from '../components/PlanExerciseItem';
import './CreatePlanPage.css';

export const CreatePlanPage: React.FC = () => {
  const navigate = useNavigate();
  const [planName, setPlanName] = useState('');
  const [days, setDays] = useState<{ number: number; exercises: DayExercise[] }[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [planId, setPlanId] = useState<number | null>(null);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<number[]>([]);
  const [showAthleteSelector, setShowAthleteSelector] = useState(false);
  const [loading, setLoading] = useState(false);

  // Загружаем спортсменов тренера
  useEffect(() => {
    loadAthletes();
  }, []);

  const loadAthletes = async () => {
  try {
    const response = await api.get('/users/coach/4/athletes');
    const data = response.data;
    
    console.log('Данные спортсменов:', data.data);
    setAthletes(data.data || []);
  } catch (error) {
    console.error('Ошибка загрузки спортсменов:', error);
  }
};

  // Создание нового плана
  const handleCreatePlan = async () => {
    if (!planName.trim()) {
      alert('Введите название плана');
      return;
    }

    setLoading(true);
    try {
      const response = await workoutService.createPlan({
        name: planName,
        coach_id: 4
      });
      setPlanId(response.data.id);
      
      for (let i = 1; i <= 3; i++) {
        await workoutService.addDay(response.data.id, i);
      }
      
      const daysResponse = await workoutService.getPlanDays(response.data.id);
      setDays(daysResponse.data.map((day: WorkoutDay) => ({
        number: day.day_number,
        exercises: day.exercises
          .filter((ex: any) => ex && ex.id)
          .map((ex: any) => ({
            ...ex,
            day_id: day.id
          }))
      })));
    } catch (error) {
      console.error('Ошибка создания плана:', error);
      alert('Ошибка при создании плана');
    } finally {
      setLoading(false);
    }
  };

  // Добавление упражнения в день
  const handleAddExercise = async (exercise: Exercise) => {
    if (!planId) return;

    try {
      const daysResponse = await workoutService.getPlanDays(planId);
      const currentDayData = daysResponse.data.find((d: WorkoutDay) => d.day_number === currentDay);
      if (!currentDayData) return;

      await workoutService.addExerciseToDay(currentDayData.id, {
        exercise_id: exercise.id,
        sets_count: 3,
        default_reps: 10,
        default_weight: 0,
        order_index: days[currentDay-1]?.exercises.length || 0
      });

      const updatedDays = await workoutService.getPlanDays(planId);
      setDays(updatedDays.data.map((day: WorkoutDay) => ({
        number: day.day_number,
        exercises: day.exercises
          .filter((ex: any) => ex && ex.id)
          .map((ex: any) => ({
            ...ex,
            day_id: day.id
          }))
      })));
      
      setShowExerciseSelector(false);
    } catch (error) {
      console.error('Ошибка добавления упражнения:', error);
    }
  };

  // Обновление упражнения
  const handleUpdateExercise = async (exerciseId: number, data: any) => {
    try {
      await workoutService.updateDayExercise(exerciseId, data);
      
      if (planId) {
        const daysResponse = await workoutService.getPlanDays(planId);
        setDays(daysResponse.data.map((day: WorkoutDay) => ({
          number: day.day_number,
          exercises: day.exercises
            .filter((ex: any) => ex && ex.id)
            .map((ex: any) => ({
              ...ex,
              day_id: day.id
            }))
        })));
      }
    } catch (error) {
      console.error('Ошибка обновления упражнения:', error);
    }
  };

  // Удаление упражнения
  const handleDeleteExercise = async (exerciseId: number) => {
    if (!confirm('Удалить упражнение из дня?')) return;
    
    try {
      await workoutService.deleteDayExercise(exerciseId);
      
      if (planId) {
        const daysResponse = await workoutService.getPlanDays(planId);
        setDays(daysResponse.data.map((day: WorkoutDay) => ({
          number: day.day_number,
          exercises: day.exercises
            .filter((ex: any) => ex && ex.id)
            .map((ex: any) => ({
              ...ex,
              day_id: day.id
            }))
        })));
      }
    } catch (error) {
      console.error('Ошибка удаления упражнения:', error);
    }
  };

  // Перемещение упражнения вверх
  const handleMoveUp = async (dayNumber: number, index: number) => {
    if (index === 0) return;
    
    const day = days.find(d => d.number === dayNumber);
    if (!day) return;
    
    const exercises = [...day.exercises];
    [exercises[index-1], exercises[index]] = [exercises[index], exercises[index-1]];
    
    if (planId && exercises[0]?.day_id) {
      try {
        const orderData = exercises.map((ex, i) => ({ id: ex.id, order_index: i }));
        await workoutService.reorderExercises(exercises[0].day_id, orderData);
        
        const updatedDays = [...days];
        const dayIndex = updatedDays.findIndex(d => d.number === dayNumber);
        if (dayIndex !== -1) {
          updatedDays[dayIndex].exercises = exercises;
          setDays(updatedDays);
        }
      } catch (error) {
        console.error('Ошибка перемещения:', error);
      }
    }
  };

  // Перемещение упражнения вниз
  const handleMoveDown = async (dayNumber: number, index: number) => {
    const day = days.find(d => d.number === dayNumber);
    if (!day || index === day.exercises.length - 1) return;
    
    const exercises = [...day.exercises];
    [exercises[index], exercises[index+1]] = [exercises[index+1], exercises[index]];
    
    if (planId && exercises[0]?.day_id) {
      try {
        const orderData = exercises.map((ex, i) => ({ id: ex.id, order_index: i }));
        await workoutService.reorderExercises(exercises[0].day_id, orderData);
        
        const updatedDays = [...days];
        const dayIndex = updatedDays.findIndex(d => d.number === dayNumber);
        if (dayIndex !== -1) {
          updatedDays[dayIndex].exercises = exercises;
          setDays(updatedDays);
        }
      } catch (error) {
        console.error('Ошибка перемещения:', error);
      }
    }
  };

  // Добавление нового дня
  const handleAddDay = async () => {
    if (!planId || days.length >= 10) return;
    
    try {
      await workoutService.addDay(planId, days.length + 1);
      const daysResponse = await workoutService.getPlanDays(planId);
      setDays(daysResponse.data.map((day: WorkoutDay) => ({
        number: day.day_number,
        exercises: day.exercises
          .filter((ex: any) => ex && ex.id)
          .map((ex: any) => ({
            ...ex,
            day_id: day.id
          }))
      })));
    } catch (error) {
      console.error('Ошибка добавления дня:', error);
    }
  };

  // Назначение плана спортсменам
  const handleAssignPlans = async () => {
    if (!planId || selectedAthletes.length === 0) {
      alert('Выберите спортсменов');
      return;
    }

    try {
      for (const athleteId of selectedAthletes) {
        await workoutService.assignToAthlete(planId, athleteId);
      }
      alert('План успешно назначен спортсменам!');
      setShowAthleteSelector(false);
    } catch (error) {
      console.error('Ошибка назначения плана:', error);
      alert('Ошибка при назначении плана');
    }
  };

  return (
    <div className="create-plan-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/coach/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Создание плана</h1>
      </div>

      {!planId ? (
        <div className="plan-setup">
          <input
            type="text"
            placeholder="Название плана (например: Месяц 1 - Начальный уровень)"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="plan-name-input"
          />
          <button 
            className="create-btn"
            onClick={handleCreatePlan}
            disabled={loading}
          >
            <Save size={20} />
            {loading ? 'Создание...' : 'Создать план'}
          </button>
        </div>
      ) : (
        <>
          <div className="days-tabs">
            {days.map((day) => (
              <button
                key={day.number}
                className={`day-tab ${currentDay === day.number ? 'active' : ''}`}
                onClick={() => setCurrentDay(day.number)}
              >
                День {day.number}
              </button>
            ))}
            {days.length < 10 && (
              <button className="add-day-btn" onClick={handleAddDay}>
                <Plus size={18} />
                Добавить день
              </button>
            )}
          </div>

          <div className="day-content">
            <div className="exercises-list">
              {days[currentDay-1]?.exercises.map((exercise, index) => (
                <PlanExerciseItem
                  key={exercise.id}
                  exercise={exercise}
                  onUpdate={handleUpdateExercise}
                  onDelete={handleDeleteExercise}
                  onMoveUp={() => handleMoveUp(currentDay, index)}
                  onMoveDown={() => handleMoveDown(currentDay, index)}
                  showMoveButtons={days[currentDay-1]?.exercises.length > 1}
                />
              ))}

              <button
                className="add-exercise-btn"
                onClick={() => setShowExerciseSelector(true)}
              >
                <Plus size={20} />
                Добавить упражнение
              </button>
            </div>
          </div>

          <div className="plan-actions">
            <button
              className="assign-btn"
              onClick={() => setShowAthleteSelector(true)}
            >
              <Users size={20} />
              Назначить спортсменам
            </button>
          </div>
        </>
      )}

      {showExerciseSelector && (
        <ExerciseSelector
          onSelect={handleAddExercise}
          onClose={() => setShowExerciseSelector(false)}
          selectedExerciseIds={days[currentDay-1]?.exercises.map(ex => ex.exercise_id) || []}
        />
      )}

      {showAthleteSelector && (
        <div className="selector-overlay" onClick={() => setShowAthleteSelector(false)}>
          <div className="selector-content" onClick={e => e.stopPropagation()}>
            <div className="selector-header">
              <h2>Выберите спортсменов</h2>
              <button className="close-btn" onClick={() => setShowAthleteSelector(false)}>
                <ArrowLeft size={20} />
              </button>
            </div>

            <div className="athlete-list">
              {athletes.map(athlete => (
                <label key={athlete.id} className="athlete-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedAthletes.includes(athlete.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAthletes([...selectedAthletes, athlete.id]);
                      } else {
                        setSelectedAthletes(selectedAthletes.filter(id => id !== athlete.id));
                      }
                    }}
                  />
                  <span>{athlete.first_name} {athlete.last_name}</span>
                </label>
              ))}
            </div>

            <div className="selector-actions">
              <button className="cancel-btn" onClick={() => setShowAthleteSelector(false)}>
                Отмена
              </button>
              <button className="save-btn" onClick={handleAssignPlans}>
                Назначить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};