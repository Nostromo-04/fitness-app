import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell, CheckCircle, Circle } from 'lucide-react';
import athleteService from '../services/athleteService';
import './AthletePlanPage.css';

interface WorkoutDay {
  id: number;
  day_number: number;
  exercises: any[];
}

export const AthletePlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { planId } = useParams<{ planId: string }>();
  const [plan, setPlan] = useState<any>(null);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planId) {
      loadPlanDetails();
      loadCompletedDays();
    }
  }, [planId]);

  const loadPlanDetails = async () => {
    try {
      const response = await athleteService.getPlanDetails(Number(planId));
      setPlan(response.data);
      setDays(response.data.days || []);
    } catch (error) {
      console.error('Ошибка загрузки плана:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedDays = async () => {
    // TODO: загрузить выполненные дни из истории
    // Пока заглушка
    setCompletedDays([]);
  };

  const isDayCompleted = (dayNumber: number) => {
    return completedDays.includes(dayNumber);
  };

  const handleStartDay = (day: WorkoutDay) => {
    navigate(`/athlete/workout/${planId}/day/${day.id}`);
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="athlete-plan-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/athlete/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1>{plan?.name}</h1>
      </div>

      <div className="plan-info">
        <p className="plan-description">
          {days.length} тренировок • {plan?.athletes_count || 0} спортсменов
        </p>
      </div>

      <div className="days-list">
        {days.map((day) => (
          <div 
            key={day.id} 
            className={`day-card ${isDayCompleted(day.day_number) ? 'completed' : ''}`}
            onClick={() => handleStartDay(day)}
          >
            <div className="day-number">
              День {day.day_number}
            </div>
            
            <div className="day-info">
              <div className="exercises-count">
                <Dumbbell size={16} />
                <span>{day.exercises?.length || 0} упражнений</span>
              </div>
              
              {isDayCompleted(day.day_number) ? (
                <div className="completed-badge">
                  <CheckCircle size={20} />
                  <span>Выполнено</span>
                </div>
              ) : (
                <button className="start-day-btn">
                  Начать
                </button>
              )}
            </div>

            {!isDayCompleted(day.day_number) && day.exercises && (
              <div className="exercises-preview">
                {day.exercises.slice(0, 3).map((ex: any, idx: number) => (
                  <span key={idx} className="exercise-tag">
                    {ex.exercise_name}
                  </span>
                ))}
                {day.exercises.length > 3 && (
                  <span className="exercise-tag more">
                    +{day.exercises.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};