import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Dumbbell, Calendar, PlusCircle, BarChart, CalendarDays, TrendingUp } from 'lucide-react';
//import { Users, Dumbbell, Calendar, PlusCircle, CalendarDays, TrendingUp } from 'lucide-react';
import api from '../services/api';
import workoutService from '../services/workoutService';
import './CoachDashboard.css';
import athleteService from '../services/athleteService';

interface Athlete {
  id: number;
  first_name: string;
  last_name?: string;
  phone?: string;
}

export const CoachDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [plansCount, setPlansCount] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const coachId = localStorage.getItem('selectedCoachId');
    if (coachId) {
      loadCoachInfo(parseInt(coachId));
      fetchAthletes(parseInt(coachId));
      fetchPlansCount(parseInt(coachId));
      fetchTotalWorkouts(parseInt(coachId));
    } else {
      navigate('/select-user');
    }
  }, []);

  const loadCoachInfo = async (coachId: number) => {
    try {
      const response = await api.get(`/users/${coachId}`);
      const coach = response.data.data;
    } catch (error) {
      console.error('Ошибка загрузки информации о тренере:', error);
    }
  };

  const fetchAthletes = async (coachId: number) => {
    try {
      const response = await api.get(`/users/coach/${coachId}/athletes`);
      setAthletes(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки спортсменов:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlansCount = async (coachId: number) => {
    try {
      const response = await workoutService.getCoachPlans(coachId);
      setPlansCount(response.data.length);
    } catch (error) {
      console.error('Ошибка загрузки количества планов:', error);
    }
  };

  const fetchTotalWorkouts = async (coachId: number) => {
    try {
      // Получаем всех спортсменов тренера
      const athletesResponse = await api.get(`/users/coach/${coachId}/athletes`);
      const athletes = athletesResponse.data.data || [];
      
      let total = 0;
      // Для каждого спортсмена получаем количество тренировок
      for (const athlete of athletes) {
        try {
          const summaryResponse = await athleteService.getAthleteSummary(athlete.id);
          const workoutsCount = parseInt(summaryResponse.data.summary.total_workouts) || 0;
          total += workoutsCount;
        } catch (error) {
          console.error(`Ошибка загрузки тренировок для спортсмена ${athlete.id}:`, error);
        }
      }
      setTotalWorkouts(total);
    } catch (error) {
      console.error('Ошибка загрузки общего количества тренировок:', error);
    }
  };

  return (
    <div className="coach-dashboard">
      <div className="dashboard-header">
        <h1>Панель тренера</h1>
        <p>Управляйте тренировками и спортсменами</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Users size={24} />
          <div className="stat-info">
            <span className="stat-value">{athletes.length}</span>
            <span className="stat-label">Всего Спортсменов</span>
          </div>
        </div>

        <div className="stat-card">
          <Dumbbell size={24} />
          <div className="stat-info">
            <span className="stat-value">{plansCount}</span>
            <span className="stat-label">Всего Планов</span>
          </div>
        </div>

        <div className="stat-card">
          <Calendar size={24} />
          <div className="stat-info">
            <span className="stat-value">{totalWorkouts}</span>
            <span className="stat-label">Всего Тренировок</span>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="action-button primary" onClick={() => navigate('/coach/exercises')}>
          <Dumbbell size={20} />
          Библиотека упражнений
        </button>

        <button className="action-button secondary" onClick={() => navigate('/coach/create-plan')}>
          <PlusCircle size={20} />
          Создать план
        </button>
      </div>

      <div className="section">
        <h2>Мои спортсмены</h2>
        {loading ? (
          <p>Загрузка...</p>
        ) : athletes.length > 0 ? (
          <div className="athletes-list">
            {athletes.map((athlete) => (
              <div key={athlete.id} className="athlete-card">
                <div className="athlete-avatar">
                  {athlete.first_name[0]}
                  {athlete.last_name?.[0]}
                </div>
                <div className="athlete-info">
                  <h3>{athlete.first_name} {athlete.last_name}</h3>
                  <p>{athlete.phone || 'Нет телефона'}</p>
                </div>
                <div className="athlete-actions">
                  <button 
    className="athlete-action-btn plans"
    onClick={() => navigate(`/coach/athlete/${athlete.id}/plans`)}
    title="Планы спортсмена"
  >
    <Dumbbell size={18} />
  </button>
                  <button 
                    className="athlete-action-btn calendar"
                    onClick={() => navigate(`/coach/athlete/${athlete.id}/calendar`)}
                    title="Календарь тренировок"
                  >
                    <CalendarDays size={18} />
                  </button>
                  <button 
                    className="athlete-action-btn progress"
                    onClick={() => navigate(`/coach/athlete/${athlete.id}/progress`)}
                    title="Прогресс спортсмена"
                  >
                    <TrendingUp size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">У вас пока нет спортсменов</p>
        )}
      </div>
    </div>
  );
};