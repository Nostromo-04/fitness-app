import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ThumbsUp, ThumbsDown, Dumbbell, Clock, BarChart } from 'lucide-react';
import athleteService from '../services/athleteService';
import './AthleteCompletePage.css';

interface LocationState {
  sessionId: number;
  planName: string;
}

export const AthleteCompletePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const [selectedEmoji, setSelectedEmoji] = useState<'👍' | '👎' | null>(null);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalSets: 0,
    totalExercises: 0,
    totalWeight: 0
  });

  useEffect(() => {
    if (!state?.sessionId) {
      navigate('/athlete/dashboard');
      return;
    }
    loadWorkoutStats();
  }, []);

  const loadWorkoutStats = async () => {
    try {
      // Получаем все подходы тренировки
      const response = await athleteService.getSessionSets(state.sessionId);
      const sets = response.data || [];
      
      const totalSets = sets.length;
      const uniqueExercises = new Set(sets.map((s: any) => s.exercise_id)).size;
      const totalWeight = sets.reduce((sum: number, s: any) => sum + (s.weight_done * s.reps_done), 0);
      
      setStats({
        totalSets,
        totalExercises: uniqueExercises,
        totalWeight
      });
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  const handleComplete = async () => {
    if (!selectedEmoji || !state?.sessionId) return;

    setSaving(true);
    try {
      await athleteService.completeWorkout(state.sessionId, selectedEmoji);
      navigate('/athlete/dashboard');
    } catch (error) {
      console.error('Ошибка завершения тренировки:', error);
      alert('Не удалось завершить тренировку');
    } finally {
      setSaving(false);
    }
  };

  if (!state) return null;

  return (
    <div className="athlete-complete-page">
      <div className="complete-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1>Тренировка завершена!</h1>
      </div>

      <div className="congrats-message">
        <div className="trophy-icon">🏆</div>
        <h2>Отличная работа!</h2>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Dumbbell size={24} />
          <div className="stat-info">
            <span className="stat-value">{stats.totalExercises}</span>
            <span className="stat-label">упражнений</span>
          </div>
        </div>

        <div className="stat-card">
          <Clock size={24} />
          <div className="stat-info">
            <span className="stat-value">{stats.totalSets}</span>
            <span className="stat-label">подходов</span>
          </div>
        </div>

        <div className="stat-card">
          <BarChart size={24} />
          <div className="stat-info">
            <span className="stat-value">{stats.totalWeight} кг</span>
            <span className="stat-label">общий вес</span>
          </div>
        </div>
      </div>

      <div className="feedback-section">
        <h3>Как прошла тренировка?</h3>
        <div className="emoji-buttons">
          <button
            className={`emoji-btn ${selectedEmoji === '👍' ? 'selected' : ''}`}
            onClick={() => setSelectedEmoji('👍')}
          >
            <ThumbsUp size={32} />
            <span>Легко</span>
          </button>
          <button
            className={`emoji-btn ${selectedEmoji === '👎' ? 'selected' : ''}`}
            onClick={() => setSelectedEmoji('👎')}
          >
            <ThumbsDown size={32} />
            <span>Тяжело</span>
          </button>
        </div>
      </div>

      <div className="complete-actions">
        <button
          className="complete-btn"
          onClick={handleComplete}
          disabled={!selectedEmoji || saving}
        >
          {saving ? 'Сохранение...' : 'Завершить'}
        </button>
      </div>
    </div>
  );
};