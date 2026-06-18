import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, CheckCircle, Circle, Plus, Volume2, VolumeX } from 'lucide-react';
import athleteService from '../services/athleteService';
import './AthleteWorkoutPage.css';

interface Exercise {
  id: number;
  exercise_id: number;
  exercise_name: string;
  muscle_group: string;
  sets_count: number;
  default_reps: number;
  default_weight: number;
  order_index: number;
  image_url?: string;
  video_url?: string;
}

interface Set {
  set_number: number;
  reps: number;
  weight: number | null;
  completed: boolean;
}

// Новый тип для предыдущей тренировки
interface PreviousWorkoutSet {
  set_number: number;
  reps_done: number;
  weight_done: number;
  is_completed: boolean;
}

interface PreviousWorkout {
  id: number;
  workout_date: string;
  plan_name: string;
  day_number: number;
  exercises: {
    exercise_id: number;
    exercise_name: string;
    sets: PreviousWorkoutSet[];
  }[];
}

export const AthleteWorkoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { planId, dayId } = useParams<{ planId: string; dayId: string }>();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sets, setSets] = useState<{ [key: number]: Set[] }>({});
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [timerDefault, setTimerDefault] = useState(180);
  const [timerValue, setTimerValue] = useState(180);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSound, setTimerSound] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previousWorkout, setPreviousWorkout] = useState<PreviousWorkout | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  const currentExercise = exercises[currentExerciseIndex];
  const currentSets = sets[currentExercise?.id] || [];

  useEffect(() => {
    loadWorkoutData();
    initAudio();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentExercise) {
      loadPreviousWorkout(currentExercise.exercise_id);
    }
  }, [currentExercise]);

  const initAudio = () => {
    audioRef.current = new Audio('/sounds/beep.mp3');
  };

  // Новая функция: загрузка предыдущей тренировки с этим упражнением
  const loadPreviousWorkout = async (exerciseId: number) => {
    const athleteId = localStorage.getItem('selectedAthleteId');
    if (!athleteId) return;
    
    setProgressLoading(true);
    try {
      // Получаем календарь за текущий месяц
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      const calendarResponse = await athleteService.getWorkoutCalendar(
        parseInt(athleteId), 
        currentYear, 
        currentMonth
      );
      
      const calendar = calendarResponse.data.calendar || {};
      let allSessions: any[] = [];
      
      // Собираем все сессии из календаря
      for (const dayKey in calendar) {
        const sessions = calendar[dayKey]?.sessions || [];
        allSessions = [...allSessions, ...sessions];
      }
      
      // Сортируем по дате (от новых к старым)
      allSessions.sort((a, b) => {
        const dateA = new Date(a.workout_date);
        const dateB = new Date(b.workout_date);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Ищем сессию, которая не является текущей и содержит это упражнение
      let foundWorkout: PreviousWorkout | null = null;
      
      for (const session of allSessions) {
        // Пропускаем текущую сессию
        if (session.id === sessionId) continue;
        
        try {
          // Получаем детали тренировки
          const detailsResponse = await athleteService.getWorkoutByDate(
            parseInt(athleteId),
            session.workout_date.split('T')[0]
          );
          
          const workoutData = detailsResponse.data;
          
          // Проверяем, есть ли в этой тренировке нужное упражнение
          const exerciseData = workoutData.exercises?.find(
            (ex: any) => ex.exercise_id === exerciseId
          );
          
          if (exerciseData && exerciseData.sets && exerciseData.sets.length > 0) {
            foundWorkout = {
              id: workoutData.id,
              workout_date: workoutData.workout_date,
              plan_name: workoutData.plan_name,
              day_number: workoutData.day_number,
              exercises: [{
                exercise_id: exerciseId,
                exercise_name: exerciseData.exercise_name,
                sets: exerciseData.sets.map((set: any) => ({
                  set_number: set.set_number,
                  reps_done: set.reps_done,
                  weight_done: set.weight_done,
                  is_completed: set.is_completed
                }))
              }]
            };
            break;
          }
        } catch (error) {
          console.log('Ошибка загрузки деталей тренировки:', error);
          continue;
        }
      }
      
      setPreviousWorkout(foundWorkout);
    } catch (error) {
      console.error('Ошибка загрузки предыдущей тренировки:', error);
    } finally {
      setProgressLoading(false);
    }
  };

  const loadWorkoutData = async () => {
    try {
      const response = await athleteService.getPlanDetails(Number(planId));
      const day = response.data.days.find((d: any) => d.id === Number(dayId));
      
      if (day) {
        setExercises(day.exercises || []);
        
        const initialSets: { [key: number]: Set[] } = {};
        day.exercises.forEach((ex: Exercise) => {
          initialSets[ex.id] = Array.from({ length: ex.sets_count }, (_, i) => ({
            set_number: i + 1,
            reps: ex.default_reps,
            weight: ex.default_weight === 0 ? null : ex.default_weight,
            completed: false
          }));
        });
        setSets(initialSets);
        
        const athleteId = localStorage.getItem('selectedAthleteId');
        if (!athleteId) {
          console.error('Не выбран спортсмен');
          return;
        }
        
        const sessionResponse = await athleteService.startWorkout(parseInt(athleteId), Number(planId), Number(dayId));
        setSessionId(sessionResponse.data.id);
      }
    } catch (error) {
      console.error('Ошибка загрузки тренировки:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetComplete = async (exerciseId: number, setNumber: number, completed: boolean) => {
    if (!sessionId) return;

    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    setSets(prevSets => {
      const updatedSets = { ...prevSets };
      const setIndex = updatedSets[exerciseId]?.findIndex(s => s.set_number === setNumber);
      
      if (setIndex !== -1 && setIndex !== undefined) {
        updatedSets[exerciseId][setIndex].completed = completed;
        
        // Сохраняем на сервер
        athleteService.logSet(sessionId, {
          exercise_id: exercise.exercise_id,
          set_number: setNumber,
          reps_done: updatedSets[exerciseId][setIndex].reps,
          weight_done: updatedSets[exerciseId][setIndex].weight,
          is_completed: completed
        }).catch(error => {
          console.error('Ошибка сохранения подхода:', error);
          // Откат при ошибке
          updatedSets[exerciseId][setIndex].completed = !completed;
        });
      }
      return updatedSets;
    });
  };

  const handleSetChange = (exerciseId: number, setNumber: number, field: 'reps' | 'weight', value: number | null) => {
    setSets(prevSets => {
      const updatedSets = { ...prevSets };
      const setIndex = updatedSets[exerciseId]?.findIndex(s => s.set_number === setNumber);
      
      if (setIndex !== -1 && setIndex !== undefined) {
        updatedSets[exerciseId][setIndex][field] = value;
        
        if (field === 'weight' && setIndex < updatedSets[exerciseId].length - 1) {
          for (let i = setIndex + 1; i < updatedSets[exerciseId].length; i++) {
            updatedSets[exerciseId][i][field] = value;
          }
        }
      }
      return updatedSets;
    });
  };

  const handleAddSet = async (exerciseId: number) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    setSets(prevSets => {
      const currentExerciseSets = prevSets[exerciseId] || [];
      if (currentExerciseSets.length >= 10) {
        alert('Максимальное количество подходов - 10');
        return prevSets;
      }

      const lastSet = currentExerciseSets[currentExerciseSets.length - 1];
      const newSetNumber = currentExerciseSets.length + 1;
      const newSet: Set = {
        set_number: newSetNumber,
        reps: lastSet ? lastSet.reps : exercise.default_reps,
        weight: lastSet ? (lastSet.weight !== null ? lastSet.weight : null) : (exercise.default_weight === 0 ? null : exercise.default_weight),
        completed: false
      };

      return {
        ...prevSets,
        [exerciseId]: [...currentExerciseSets, newSet]
      };
    });
  };

  const isExerciseCompleted = (exerciseId: number) => {
    const exerciseSets = sets[exerciseId] || [];
    return exerciseSets.length > 0 && exerciseSets.every(s => s.completed);
  };

  const allExercisesCompleted = () => {
    return exercises.length > 0 && exercises.every(ex => isExerciseCompleted(ex.id));
  };

  const startTimer = () => {
    setTimerActive(true);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setTimerValue(prev => {
        if (prev <= 1) {
          setTimerActive(false);
          if (timerRef.current) clearInterval(timerRef.current);
          
          if (timerSound && audioRef.current) {
            audioRef.current.play().catch(e => console.log('Ошибка воспроизведения звука:', e));
          }
          
          setTimerValue(timerDefault);
          return timerDefault;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resetTimer = () => {
    setTimerValue(timerDefault);
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleTimerIncrease = () => {
    const newValue = Math.min(timerValue + 60, 600);
    setTimerValue(newValue);
    setTimerDefault(newValue);
  };

  const handleTimerDecrease = () => {
    const newValue = Math.max(timerValue - 60, 60);
    setTimerValue(newValue);
    setTimerDefault(newValue);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCompleteWorkout = async () => {
    if (!sessionId) return;

    navigate('/athlete/complete', { 
      state: { 
        sessionId,
        planName: exercises[0]?.exercise_name
      } 
    });
  };

  // Получаем данные для отображения предыдущей тренировки
  const getPreviousWorkoutData = () => {
    if (!previousWorkout || previousWorkout.exercises.length === 0) return null;
    const exerciseData = previousWorkout.exercises[0];
    if (!exerciseData || exerciseData.sets.length === 0) return null;
    return exerciseData;
  };

  const previousData = getPreviousWorkoutData();

  // Функция для форматирования веса с 2 десятичными знаками
  const formatWeight = (weight: number): string => {
    if (weight === undefined || weight === null) return '0';
    const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight;
    if (isNaN(numWeight)) return '0';
    return numWeight.toFixed(2);
  };

  if (loading) {
    return <div className="loading">Загрузка тренировки...</div>;
  }

  return (
    <div className="athlete-workout-page">
      <div className="workout-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="workout-progress">
          <div className="progress-text">
            Упражнение {currentExerciseIndex + 1} из {exercises.length}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${((currentExerciseIndex + 1) / exercises.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {currentExercise && (
        <div className="current-exercise">
          <h2>{currentExercise.exercise_name}</h2>
          <p className="muscle-group">{currentExercise.muscle_group}</p>
          
          {/* НОВЫЙ БЛОК: Предыдущая тренировка */}
          <div className="progress-chart-mini">
            <div className="progress-chart-header">
              <span className="progress-chart-title">
                Предыдущая тренировка
              </span>
              {progressLoading && <span className="progress-chart-loading">Загрузка...</span>}
            </div>
            
            {previousData ? (
              <div className="previous-sets-column">
                {previousData.sets.map((set, idx) => (
                  <div key={idx} className="previous-set-item-center">
                    {set.reps_done} × {formatWeight(set.weight_done)} кг
                  </div>
                ))}
              </div>
            ) : (
              <div className="progress-chart-empty">
                {progressLoading ? 'Поиск предыдущей тренировки...' : 'Нет предыдущих тренировок'}
              </div>
            )}
          </div>

          {(currentExercise.image_url || currentExercise.video_url) && (
            <div className="exercise-media">
              {currentExercise.image_url && (
                <a href={currentExercise.image_url} target="_blank" rel="noopener noreferrer">
                  📷 Смотреть фото
                </a>
              )}
              {currentExercise.video_url && (
                <a href={currentExercise.video_url} target="_blank" rel="noopener noreferrer">
                  🎥 Смотреть видео
                </a>
              )}
            </div>
          )}
        </div>
      )}

      <div className="workout-sets-list">
        <div className="workout-sets-header">
          <span>Подход</span>
          <span>Повторы</span>
          <span>Вес (кг)</span>
          <span>Выполнено</span>
        </div>

        {currentSets.map((set) => (
          <div key={set.set_number} className="workout-set-row">
            <span className="set-number">{set.set_number}</span>
            
            <input
              type="number"
              min="1"
              value={set.reps}
              onChange={(e) => handleSetChange(currentExercise.id, set.set_number, 'reps', parseInt(e.target.value) || 1)}
              disabled={set.completed}
              className="set-input"
            />
            
            <input
              type="number"
              min="0"
              step="2.5"
              value={set.weight === null ? '' : set.weight}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                handleSetChange(currentExercise.id, set.set_number, 'weight', value);
              }}
              disabled={set.completed}
              className="set-input"
              placeholder="вес"
            />
            
            <button
              className={`set-checkbox ${set.completed ? 'completed' : ''}`}
              onClick={() => handleSetComplete(currentExercise.id, set.set_number, !set.completed)}
            >
              {set.completed ? <CheckCircle size={24} /> : <Circle size={24} />}
            </button>
          </div>
        ))}

        {currentSets.length < 10 && (
          <button 
            className="add-set-btn"
            onClick={() => handleAddSet(currentExercise.id)}
          >
            <Plus size={20} />
            Добавить подход
          </button>
        )}
      </div>

      <div className="timer-section">
        <div className="timer-display">
          <span className="timer-value">{formatTime(timerValue)}</span>
        </div>
        
        <div className="timer-controls">
          <button 
            className={`timer-btn ${timerSound ? 'active' : ''}`}
            onClick={() => setTimerSound(!timerSound)}
            title={timerSound ? 'Звук вкл' : 'Звук выкл'}
          >
            {timerSound ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          
          <button 
            className="timer-btn play-pause"
            onClick={startTimer}
            disabled={timerActive}
          >
            <Play size={20} />
          </button>
          
          <button 
            className="timer-btn play-pause"
            onClick={pauseTimer}
            disabled={!timerActive}
          >
            <Pause size={20} />
          </button>
          
          <button 
            className="timer-btn"
            onClick={resetTimer}
          >
            <RotateCcw size={20} />
          </button>
          
          <button 
            className="timer-btn"
            onClick={handleTimerIncrease}
          >
            +1
          </button>
          
          <button 
            className="timer-btn"
            onClick={handleTimerDecrease}
          >
            -1
          </button>
        </div>
      </div>

      <div className="workout-footer">
        <div className="exercise-nav">
          <button
            className="nav-btn"
            disabled={currentExerciseIndex === 0}
            onClick={() => setCurrentExerciseIndex(prev => prev - 1)}
          >
            Предыдущее
          </button>
          
          <button
            className="nav-btn"
            disabled={currentExerciseIndex === exercises.length - 1}
            onClick={() => setCurrentExerciseIndex(prev => prev + 1)}
          >
            Следующее
          </button>
        </div>

        {allExercisesCompleted() && (
          <button className="complete-workout-btn" onClick={handleCompleteWorkout}>
            Завершить тренировку
          </button>
        )}
      </div>
    </div>
  );
};