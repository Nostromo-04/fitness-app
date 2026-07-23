import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Calendar, TrendingUp, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AthleteDashboard.css';

interface Plan {
  id: number;
  name: string;
  days_count: number;
}

interface Summary {
  total_workouts: number;
  total_sets: number;
  last_workout_date: string | null;
}

export const AthleteDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { authUser } = useAuth();

  const [plans, setPlans]       = useState<Plan[]>([]);
  const [summary, setSummary]   = useState<Summary>({ total_workouts: 0, total_sets: 0, last_workout_date: null });
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const athleteId = authUser?.role === 'athlete'
      ? authUser.id
      : Number(localStorage.getItem('selectedAthleteId'));
    if (!athleteId) {
      navigate('/select-user');
      return;
    }
    loadDashboard(athleteId);
  }, [authUser?.id, authUser?.role]);

  const loadDashboard = async (athleteId: number) => {
    try {
      const [plansRes, summaryRes] = await Promise.allSettled([
        api.get(`/workouts/athlete/${athleteId}/plans`),
        api.get(`/workouts/athlete/${athleteId}/summary`),
      ]);

      if (plansRes.status === 'fulfilled') {
        const raw = plansRes.value.data;
        // API возвращает либо { data: [...] } либо напрямую массив
        setPlans(Array.isArray(raw) ? raw : (raw?.data ?? []));
      }

      if (summaryRes.status === 'fulfilled') {
        const s = summaryRes.value.data?.data?.summary;
        if (s) setSummary(s);
      }
    } catch (error) {
      console.error('Ошибка загрузки дашборда:', error);
    } finally {
      setLoading(false);
    }
  };

  const firstName = authUser?.first_name ?? '';

  return (
    <div className="athlete-dashboard">
      <div className="dashboard-header">
        <h1>Привет, {firstName}!</h1>
        <p>Ваши тренировочные планы</p>
      </div>

      {/* Статистика */}
      <div className="stats-grid">
        <div className="stat-card">
          <Dumbbell size={22} />
          <div className="stat-info">
            <span className="stat-value">{loading ? '–' : summary.total_workouts}</span>
            <span className="stat-label">Тренировок</span>
          </div>
        </div>
        <div className="stat-card">
          <TrendingUp size={22} />
          <div className="stat-info">
            <span className="stat-value">{loading ? '–' : summary.total_sets}</span>
            <span className="stat-label">Подходов</span>
          </div>
        </div>
        <div className="stat-card">
          <ClipboardList size={22} />
          <div className="stat-info">
            <span className="stat-value">{loading ? '–' : plans.length}</span>
            <span className="stat-label">Планов</span>
          </div>
        </div>
      </div>

      {/* Список планов */}
      <div className="section">
        <h2>Мои планы</h2>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--fit-muted)', padding: '40px 0' }}>
            Загрузка…
          </div>
        ) : plans.length === 0 ? (
          /* ── Пустое состояние ── */
          <div style={{
            background: 'var(--fit-card, #18181b)',
            border: '1px solid var(--fit-border, #27272a)',
            borderRadius: 18,
            padding: '36px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}>
            <Dumbbell size={44} style={{ color: 'var(--fit-muted, #a1a1aa)' }} />
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--fit-text, #f4f4f5)' }}>
              Пока планов нет
            </p>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--fit-muted, #a1a1aa)', lineHeight: 1.5 }}>
              Тренер ещё не назначил вам тренировочный план.{'\n'}
              Как только он это сделает — план появится здесь.
            </p>
          </div>
        ) : (
          <div className="plans-list">
            {plans.map((plan) => (
              <button
                key={plan.id}
                className="plan-card"
                onClick={() => navigate(`/athlete/plan/${plan.id}`)}
              >
                <div className="plan-icon">
                  <Dumbbell size={20} />
                </div>
                <div className="plan-info">
                  <h3>{plan.name}</h3>
                  <p>{plan.days_count ?? 0} {pluralDays(plan.days_count ?? 0)}</p>
                </div>
                <span className="plan-arrow">›</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Быстрые действия */}
      <div className="quick-actions">
        <button className="quick-action" onClick={() => navigate('/athlete/calendar')}>
          <Calendar size={18} />
          Календарь
        </button>
        <button className="quick-action" onClick={() => navigate('/athlete/progress')}>
          <TrendingUp size={18} />
          Прогресс
        </button>
      </div>
    </div>
  );
};

function pluralDays(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дня';
  return 'дней';
}
