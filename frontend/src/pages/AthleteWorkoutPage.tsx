import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, CheckCircle, Circle, Plus } from 'lucide-react';
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
  weight: number;
  completed: boolean;
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

  const currentExercise = exercises[currentExerciseIndex];
  const currentSets = sets[currentExercise?.id] || [];

  useEffect(() => {
    loadWorkoutData();
    initAudio();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const initAudio = () => {
    audioRef.current = new Audio('https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3');
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
            weight: ex.default_weight,
            completed: false
          }));
        });
        setSets(initialSets);
        
        const sessionResponse = await athleteService.startWorkout(2, Number(planId), Number(dayId));
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

    const updatedSets = { ...sets };
    const setIndex = updatedSets[exerciseId].findIndex(s => s.set_number === setNumber);
    
    if (setIndex !== -1) {
      updatedSets[exerciseId][setIndex].completed = completed;
      setSets(updatedSets);

      try {
        await athleteService.logSet(sessionId, {
          exercise_id: exercise.exercise_id,
          set_number: setNumber,
          reps_done: updatedSets[exerciseId][setIndex].reps,
          weight_done: updatedSets[exerciseId][setIndex].weight,
          is_completed: completed
        });
      } catch (error) {
        console.error('Ошибка сохранения подхода:', error);
        updatedSets[exerciseId][setIndex].completed = !completed;
        setSets(updatedSets);
      }
    }
  };

  const handleSetChange = (exerciseId: number, setNumber: number, field: 'reps' | 'weight', value: number) => {
    const updatedSets = { ...sets };
    const setIndex = updatedSets[exerciseId].findIndex(s => s.set_number === setNumber);
    
    if (setIndex !== -1) {
      updatedSets[exerciseId][setIndex][field] = value;
      
      if (setIndex < updatedSets[exerciseId].length - 1) {
        for (let i = setIndex + 1; i < updatedSets[exerciseId].length; i++) {
          updatedSets[exerciseId][i][field] = value;
        }
      }
      
      setSets(updatedSets);
    }
  };

  const handleAddSet = async (exerciseId: number) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    const currentExerciseSets = sets[exerciseId] || [];
    if (currentExerciseSets.length >= 10) {
      alert('Максимальное количество подходов - 10');
      return;
    }

    const lastSet = currentExerciseSets[currentExerciseSets.length - 1];
    const newSetNumber = currentExerciseSets.length + 1;
    const newSet: Set = {
      set_number: newSetNumber,
      reps: lastSet ? lastSet.reps : exercise.default_reps,
      weight: lastSet ? lastSet.weight : exercise.default_weight,
      completed: false
    };

    const updatedSets = { ...sets };
    updatedSets[exerciseId] = [...currentExerciseSets, newSet];
    setSets(updatedSets);
  };

  const isExerciseCompleted = (exerciseId: number) => {
    const exerciseSets = sets[exerciseId] || [];
    return exerciseSets.length > 0 && exerciseSets.every(s => s.completed);
  };

  const allExercisesCompleted = () => {
    return exercises.every(ex => isExerciseCompleted(ex.id));
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
          return 0;
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
              value={set.weight}
              onChange={(e) => handleSetChange(currentExercise.id, set.set_number, 'weight', parseFloat(e.target.value) || 0)}
              disabled={set.completed}
              className="set-input"
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
            🔔
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