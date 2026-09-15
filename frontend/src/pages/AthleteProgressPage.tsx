import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Calendar, Award, ChevronDown, Image as ImageIcon } from 'lucide-react';
import athleteService from '../services/athleteService';
import './AthleteProgressPage.css';

interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  image_url?: string;
  video_url?: string;
}

interface ProgressPoint {
  reps_done: number;
  weight_done: string;
  created_at: string;
  workout_date: string;
  plan_name: string;
  day_number: number;
}

interface PersonalBest {
  max_weight: number;
  max_reps: number;
  weight_done: number;
  reps_done: number;
  workout_date: string;
}

interface AthleteSummary {
  summary: {
    total_workouts: string;
    total_days: string;
    good_workouts: string;
    hard_workouts: string;
    last_workout: string | null;
  };
  recent: Array<{
    id: number;
    workout_date: string;
    feedback_emoji: string;
    plan_name: string;
    day_number: number;
  }>;
}

export const AthleteProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [progress, setProgress] = useState<ProgressPoint[]>([]);
  const [personalBest, setPersonalBest] = useState<PersonalBest | null>(null);
  const [summary, setSummary] = useState<AthleteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedExerciseId) {
      loadProgress();
    }
  }, [selectedExerciseId]);
  useEffect(() => {
    if (!selectorOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [selectorOpen]);

  const getAthleteId = (): number => {
    const athleteId = localStorage.getItem('selectedAthleteId');
    if (!athleteId) {
      console.error('Не выбран спортсмен');
      navigate('/select-user');
      return 0;
    }
    return parseInt(athleteId);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const athleteId = getAthleteId();
      if (!athleteId) return;
      
      const [exercisesRes, summaryRes] = await Promise.all([
        athleteService.getCompletedWorkoutExercises(athleteId),
        athleteService.getAthleteSummary(athleteId),
      ]);
      const completedExercises = exercisesRes.data?.exercises || [];
      setExercises(completedExercises);
      setSummary(summaryRes.data);
      setSelectedExerciseId(completedExercises[0]?.id ?? null);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    if (!selectedExerciseId) return;
    
    setProgressLoading(true);
    try {
      const athleteId = getAthleteId();
      if (!athleteId) return;
      
      const response = await athleteService.getExerciseProgress(athleteId, selectedExerciseId, 20);
      setProgress(response.data.progress || []);
      setPersonalBest(response.data.personalBest || null);
    } catch (error) {
      console.error('Ошибка загрузки прогресса:', error);
    } finally {
      setProgressLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU');
  };

  // Создаем данные для графика
  const chartData = [...progress].reverse().map(point => ({
    date: formatDate(point.workout_date),
    weight: parseFloat(point.weight_done),
    reps: point.reps_done
  }));

  const maxWeight = Math.max(...chartData.map(d => d.weight), 0);
  const selectedExercise = exercises.find(ex => ex.id === selectedExerciseId) || null;

  return (
    <div className="athlete-progress-page">
      <div className="progress-header">
        <button className="back-btn" onClick={() => navigate('/athlete/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Мой прогресс</h1>
      </div>

      {/* Сводка */}
      <div className="summary-grid">
        <div className="summary-card">
          <Calendar size={20} />
          <div className="summary-info">
            <span className="summary-value">{summary?.summary.total_workouts || 0}</span>
            <span className="summary-label">Тренировок</span>
          </div>
        </div>
        <div className="summary-card">
          <TrendingUp size={20} />
          <div className="summary-info">
            <span className="summary-value">{summary?.summary.good_workouts || 0}</span>
            <span className="summary-label">Легких</span>
          </div>
        </div>
        <div className="summary-card">
          <Award size={20} />
          <div className="summary-info">
            <span className="summary-value">{summary?.summary.hard_workouts || 0}</span>
            <span className="summary-label">Тяжелых</span>
          </div>
        </div>
      </div>

      {/* Выбор упражнения */}
      <div className="exercise-selector-section">
        <label>Выберите упражнение:</label>
        <div className="exercise-picker" ref={selectorRef}>
          <button
            type="button"
            className="exercise-select-button"
            onClick={() => setSelectorOpen(open => !open)}
            disabled={loading || exercises.length === 0}
            aria-expanded={selectorOpen}
          >
            {selectedExercise ? (
              <>
                <span className="exercise-picker-media">
                  {(selectedExercise.image_url || selectedExercise.video_url) && (
                    <img src={selectedExercise.image_url || selectedExercise.video_url} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                  )}
                  <ImageIcon className="exercise-picker-placeholder" size={22} />
                </span>
                <span className="exercise-picker-text">
                  <strong>{selectedExercise.name}</strong>
                  <small>{selectedExercise.muscle_group}</small>
                </span>
              </>
            ) : (
              <span className="exercise-picker-empty">Нет выполненных упражнений</span>
            )}
            <ChevronDown className={selectorOpen ? 'open' : ''} size={20} />
          </button>

          {selectorOpen && (
            <div className="exercise-picker-menu" role="listbox">
              {exercises.map(ex => (
                <button
                  type="button"
                  key={ex.id}
                  className={`exercise-picker-option ${ex.id === selectedExerciseId ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedExerciseId(ex.id);
                    setSelectorOpen(false);
                  }}
                  role="option"
                  aria-selected={ex.id === selectedExerciseId}
                >
                  <span className="exercise-picker-media">
                    {(ex.image_url || ex.video_url) && <img src={ex.image_url || ex.video_url} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
                    <ImageIcon className="exercise-picker-placeholder" size={22} />
                  </span>
                  <span className="exercise-picker-text">
                    <strong>{ex.name}</strong>
                    <small>{ex.muscle_group}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Личный рекорд */}
      {personalBest && (
        <div className="personal-best">
          <h3>🏆 Личный рекорд</h3>
          <div className="record-details">
            <div className="record-item">
              <span className="record-value">{personalBest.weight_done} кг</span>
              <span className="record-label">Максимальный вес</span>
            </div>
            <div className="record-item">
              <span className="record-value">{personalBest.reps_done} раз</span>
              <span className="record-label">Максимальные повторы</span>
            </div>
            <div className="record-date">
              {formatDate(personalBest.workout_date)}
            </div>
          </div>
        </div>
      )}

      {/* График прогресса */}
{selectedExerciseId && (
  <div className="progress-chart">
    <h3>Прогресс веса</h3>
    {progressLoading ? (
      <div className="loading">Загрузка...</div>
    ) : chartData.length > 0 ? (
      <div className="chart-container">
        <div className="chart-bars">
          {chartData.map((point, idx) => (
            <div key={idx} className="chart-bar-wrapper">
              <div
                className="chart-bar"
                style={{ height: `${(point.weight / maxWeight) * 150}px` }}
                title={`${point.date}: ${point.weight} кг`}
              />
              <span className="chart-label">{point.weight} кг</span>
            </div>
          ))}
        </div>
        <div className="chart-footer">
          <span className="chart-unit">Максимальный вес (кг)</span>
          <span className="chart-max">{maxWeight} кг</span>
        </div>
      </div>
    ) : (
      <p className="empty-state">Нет данных по этому упражнению</p>
    )}
  </div>
)}

      {/* История подходов */}
      {selectedExerciseId && progress.length > 0 && (
        <div className="history-table">
          <h3>История подходов</h3>
          <div className="table-header">
            <span>Дата</span>
            <span>Вес (кг)</span>
            <span>Повторы</span>
            <span>План</span>
          </div>
          <div className="table-body">
            {progress.slice(0, 10).map((point, idx) => (
              <div key={idx} className="table-row">
                <span>{formatDate(point.workout_date)}</span>
                <span className="weight-value">{point.weight_done}</span>
                <span>{point.reps_done}</span>
                <span className="plan-name">{point.plan_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};