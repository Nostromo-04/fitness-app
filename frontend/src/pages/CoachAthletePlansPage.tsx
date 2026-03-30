import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Edit, Trash2 } from 'lucide-react';
import workoutService from '../services/workoutService';
import api from '../services/api';
import './CoachAthletePlansPage.css';

interface WorkoutPlan {
  id: number;
  name: string;
  days_count: string;
  athletes_count: string;
  created_at: string;
}

export const CoachAthletePlansPage: React.FC = () => {
  const navigate = useNavigate();
  const { athleteId } = useParams<{ athleteId: string }>();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [athleteName, setAthleteName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (athleteId) {
      loadAthleteInfo();
      loadPlans();
    }
  }, [athleteId]);

  const loadAthleteInfo = async () => {
    try {
      const response = await api.get(`/users/${athleteId}`);
      const athlete = response.data.data;
      setAthleteName(`${athlete.first_name} ${athlete.last_name}`);
    } catch (error) {
      console.error('Ошибка загрузки информации о спортсмене:', error);
    }
  };

  const loadPlans = async () => {
    try {
      // Получаем тренера спортсмена
      const athleteResponse = await api.get(`/users/${athleteId}`);
      const coachId = athleteResponse.data.data.coach_id;
      
      if (coachId) {
        const response = await workoutService.getCoachPlans(coachId);
        setPlans(response.data || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки планов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlan = (planId: number) => {
  navigate(`/coach/edit-plan/${planId}`);
};

  return (
    <div className="coach-plans-page">
      <div className="plans-header">
        <button className="back-btn" onClick={() => navigate('/coach/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Планы спортсмена</h1>
      </div>

      {athleteName && (
        <div className="athlete-info-card">
          <h2>{athleteName}</h2>
        </div>
      )}

      <div className="plans-list">
        {loading ? (
          <p className="loading">Загрузка...</p>
        ) : plans.length > 0 ? (
          plans.map((plan) => (
            <div key={plan.id} className="plan-card">
              <div className="plan-icon">
                <Dumbbell size={24} />
              </div>
              <div className="plan-info">
                <h3>{plan.name}</h3>
                <p>{plan.days_count || '0'} тренировок</p>
                <p className="plan-date">
                  Создан: {new Date(plan.created_at).toLocaleDateString('ru-RU')}
                </p>
              </div>
              <div className="plan-actions">
                <button 
                  className="edit-plan-btn"
                  onClick={() => handleEditPlan(plan.id)}
                  title="Редактировать план"
                >
                  <Edit size={18} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">У спортсмена пока нет планов</p>
        )}
      </div>

      <div className="create-plan-action">
        <button 
          className="create-plan-btn"
          onClick={() => navigate('/coach/create-plan')}
        >
          <Dumbbell size={20} />
          Создать новый план
        </button>
      </div>
    </div>
  );
};