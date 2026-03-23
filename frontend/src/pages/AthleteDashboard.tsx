import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Dumbbell, TrendingUp, ThumbsUp, ThumbsDown } from 'lucide-react';
import athleteService from '../services/athleteService';
import workoutService from '../services/workoutService';
import api from '../services/api';
import './AthleteDashboard.css';

interface WorkoutPlan {
  id: number;
  name: string;
  days_count: string;
  athletes_count: string;
}

export const AthleteDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [athleteName, setAthleteName] = useState('');
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [goodWorkouts, setGoodWorkouts] = useState(0);
  const [hardWorkouts, setHardWorkouts] = useState(0);

  // Функция для правильного склонения слова "тренировка"
  const getTrainingCountText = (count: number): string => {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return `${count} тренировок`;
    }
    
    switch (lastDigit) {
      case 1:
        return `${count} тренировка`;
      case 2:
      case 3:
      case 4:
        return `${count} тренировки`;
      default:
        return `${count} тренировок`;
    }
  };

  useEffect(() => {
    const athleteId = localStorage.getItem('selectedAthleteId');
    console.log('🔍 AthleteDashboard mounted, athleteId from localStorage:', athleteId);
    
    if (athleteId) {
      loadAthleteInfo(parseInt(athleteId));
      loadPlans(parseInt(athleteId));
      loadWorkoutStats(parseInt(athleteId));
    } else {
      console.log('⚠️ Нет выбранного спортсмена, редирект на /select-user');
      navigate('/select-user');
    }
  }, []);

  const loadAthleteInfo = async (athleteId: number) => {
    console.log('📋 Загрузка информации о спортсмене ID:', athleteId);
    try {
      const response = await api.get(`/users/${athleteId}`);
      const athlete = response.data.data;
      console.log('✅ Информация о спортсмене загружена:', athlete);
      setAthleteName(`${athlete.first_name} ${athlete.last_name}`);
    } catch (error) {
      console.error('❌ Ошибка загрузки информации о спортсмене:', error);
    }
  };

  const loadPlans = async (athleteId: number) => {
    console.log('📋 Загрузка планов для спортсмена ID:', athleteId);
    try {
      console.log('📡 Запрос информации о спортсмене...');
      const athleteResponse = await api.get(`/users/${athleteId}`);
      const athlete = athleteResponse.data.data;
      console.log('✅ Информация о спортсмене получена:', athlete);
      
      const coachId = athlete.coach_id;
      console.log(`👨‍🏫 Тренер ID: ${coachId}`);
      
      if (coachId) {
        console.log(`📡 Запрос планов тренера ID ${coachId}...`);
        const response = await workoutService.getCoachPlans(coachId);
        console.log('✅ Получены планы тренера:', response.data);
        
        const assignedPlans = response.data || [];
        console.log(`📊 Найдено планов: ${assignedPlans.length}`);
        assignedPlans.forEach((plan: WorkoutPlan, idx: number) => {
          console.log(`  ${idx + 1}. ${plan.name} (ID: ${plan.id})`);
        });
        
        setPlans(assignedPlans);
      } else {
        console.log('⚠️ У спортсмена нет привязанного тренера');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки планов:', error);
    } finally {
      setLoading(false);
      console.log('🏁 Загрузка планов завершена');
    }
  };

  const loadWorkoutStats = async (athleteId: number) => {
    try {
      const summaryResponse = await athleteService.getAthleteSummary(athleteId);
      const summary = summaryResponse.data.summary;
      setTotalWorkouts(parseInt(summary.total_workouts) || 0);
      setGoodWorkouts(parseInt(summary.good_workouts) || 0);
      setHardWorkouts(parseInt(summary.hard_workouts) || 0);
    } catch (error) {
      console.error('❌ Ошибка загрузки статистики тренировок:', error);
    }
  };

  return (
    <div className="athlete-dashboard">
      <div className="dashboard-header">
        <h1>Мои тренировки</h1>
        {athleteName && <p className="athlete-name">{athleteName}</p>}
        <p>Выберите план для выполнения</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Calendar size={24} />
          <div className="stat-info">
            <span className="stat-value">{totalWorkouts}</span>
            <span className="stat-label">Всего Тренировок</span>
          </div>
        </div>

        <div className="stat-card">
          <ThumbsUp size={24} />
          <div className="stat-info">
            <span className="stat-value">{goodWorkouts}</span>
            <span className="stat-label">Всего Легкие</span>
          </div>
        </div>

        <div className="stat-card">
          <ThumbsDown size={24} />
          <div className="stat-info">
            <span className="stat-value">{hardWorkouts}</span>
            <span className="stat-label">Всего Тяжелые</span>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Доступные планы</h2>
        {loading ? (
          <p className="loading">Загрузка...</p>
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
                  <p>{getTrainingCountText(parseInt(plan.days_count) || 0)}</p>
                </div>
                <div className="plan-arrow">→</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            У вас пока нет планов тренировок<br />
            Обратитесь к тренеру
          </p>
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