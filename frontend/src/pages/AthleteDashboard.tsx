import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Dumbbell, TrendingUp, Clock } from 'lucide-react';
import api from '../services/api';
import './AthleteDashboard.css';

interface WorkoutPlan {
  id: number;
  name: string;
  days_count: string;
}

export const AthleteDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      // Временно используем ID спортсмена = 2
      const response = await api.get('/workouts/plans/coach/1');
      setPlans(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки планов:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="athlete-dashboard">
      <div className="dashboard-header">
        <h1>Мои тренировки</h1>
        <p>Выберите план для выполнения</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Calendar size={24} />
          <div className="stat-info">
            <span className="stat-value">0</span>
            <span className="stat-label">Тренировок</span>
          </div>
        </div>

        <div className="stat-card">
          <Clock size={24} />
          <div className="stat-info">
            <span className="stat-value">0</span>
            <span className="stat-label">Дней</span>
          </div>
        </div>

        <div className="stat-card">
          <TrendingUp size={24} />
          <div className="stat-info">
            <span className="stat-value">0</span>
            <span className="stat-label">Прогресс</span>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Доступные планы</h2>
        {loading ? (
          <p>Загрузка...</p>
        ) : plans.length > 0 ? (
          <div className="plans-list">
            {plans.map((plan) => (
              <div 
                key={plan.id} 
                className="plan-card"
                onClick={() => navigate(`/athlete/plan/${plan.id}`)}
              >
                <div className="plan-icon">
                  <Dumbbell size={24} />
                </div>
                <div className="plan-info">
                  <h3>{plan.name}</h3>
                  <p>{plan.days_count} тренировок</p>
                </div>
                <div className="plan-arrow">→</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">У вас пока нет планов тренировок</p>
        )}
      </div>

      <div className="quick-actions">
        <button className="quick-action" onClick={() => navigate('/athlete/calendar')}>
          <Calendar size={20} />
          Календарь
        </button>
        <button className="quick-action" onClick={() => navigate('/athlete/progress')}>
          <TrendingUp size={20} />
          Прогресс
        </button>
      </div>
    </div>
  );
};