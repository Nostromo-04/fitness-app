import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Dumbbell, BarChart2, Weight } from 'lucide-react';
import athleteService from '../services/athleteService';
import './AthleteCompletePage.css';

interface SessionStats {
  exerciseCount: number;
  setCount: number;
  totalWeightKg: number;
}

type FeedbackEmoji = '👍' | '👎';

export function AthleteCompletePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId } = (location.state as { sessionId: number; planName?: string }) || {};

  const [feedback, setFeedback] = useState<FeedbackEmoji | null>(null);
  const [stats, setStats] = useState<SessionStats>({ exerciseCount: 0, setCount: 0, totalWeightKg: 0 });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    athleteService
      .getSessionSets(sessionId)
      .then((data) => {
        const sets: { weight_done?: number; reps_done?: number; is_completed?: boolean; exercise_id?: number }[] =
          Array.isArray(data) ? data : (data.data ?? []);
        const completed = sets.filter((s) => s.is_completed);
        const exerciseIds = new Set(completed.map((s) => s.exercise_id));
        const totalWeight = completed.reduce((acc, s) => {
          const w = parseFloat(String(s.weight_done ?? 0));
          const r = parseInt(String(s.reps_done ?? 0), 10);
          return acc + (isNaN(w) || isNaN(r) ? 0 : w * r);
        }, 0);
        setStats({
          exerciseCount: exerciseIds.size,
          setCount: completed.length,
          totalWeightKg: Math.round(totalWeight),
        });
      })
      .catch(() => {});
  }, [sessionId]);

  const handleSubmit = async () => {
    if (!feedback || !sessionId || submitting) return;
    setSubmitting(true);
    try {
      await athleteService.completeWorkout(sessionId, feedback);
      navigate('/athlete/dashboard', { replace: true });
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="athlete-complete-page">
      <div className="complete-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} />
        </button>
        <h1>Тренировка завершена!</h1>
      </div>

      <div className="congrats-message">
        <div className="trophy-svg-wrapper">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </div>
        <h2>Отличная работа!</h2>
        <p>Так держать, не останавливайся!</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <Dumbbell size={22} color="var(--fit-accent, #a3e635)" />
            <span className="stat-value">{stats.exerciseCount}</span>
            <span className="stat-label">упражнений</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <BarChart2 size={22} color="var(--fit-accent, #a3e635)" />
            <span className="stat-value">{stats.setCount}</span>
            <span className="stat-label">подходов</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <Weight size={22} color="var(--fit-accent, #a3e635)" />
            <span className="stat-value">{stats.totalWeightKg} кг</span>
            <span className="stat-label">общий вес</span>
          </div>
        </div>
      </div>

      <div className="feedback-section">
        <h3>Как прошла тренировка?</h3>
        <div className="emoji-buttons">
          <button
            className={`emoji-btn easy${feedback === '👍' ? ' selected' : ''}`}
            onClick={() => setFeedback('👍')}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 10v12" />
              <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
            </svg>
            <span>Легко</span>
          </button>
          <button
            className={`emoji-btn hard${feedback === '👎' ? ' selected' : ''}`}
            onClick={() => setFeedback('👎')}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 14V2" />
              <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
            </svg>
            <span>Тяжело</span>
          </button>
        </div>
      </div>

      <div className="complete-actions">
        <button
          className="complete-btn"
          onClick={handleSubmit}
          disabled={!feedback || submitting}
        >
          {submitting ? 'Сохранение…' : 'Сохранить и выйти'}
        </button>
      </div>
    </div>
  );
}
