import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import athleteService from '../services/athleteService';
import './AthletePlanPage.css';

interface WorkoutDay {
  id: number;
  day_number: number;
  exercises: any[];
}

export const AthletePlanPage: React.FC = () => {
  const navigate = useNavigate();
  const { planId, athleteId: routeAthleteId } = useParams<{ planId: string; athleteId?: string }>();
  const coachMode = Boolean(routeAthleteId);
  const [plan, setPlan] = useState<any>(null);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [nextDayNumber, setNextDayNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedDayIds, setExpandedDayIds] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (planId) {
      loadPlanDetails();
    }
  }, [planId]);

  useEffect(() => {
    if (plan && planId) {
      loadLastCompletedDay();
    }
  }, [plan, planId]);

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

  const loadLastCompletedDay = async () => {
    try {
      const athleteId = routeAthleteId || localStorage.getItem('selectedAthleteId');
      if (!athleteId) {
        console.error('Не выбран спортсмен');
        return;
      }

      const lastCompletedResponse = await athleteService.getLastCompletedPlanDay(
        parseInt(athleteId),
        Number(plan.id)
      );
      const lastCompletedDay = lastCompletedResponse.data?.day_number ?? null;

      const allDayNumbers = days.map(d => d.day_number).sort((a, b) => a - b);
      let nextDay = null;

      if (lastCompletedDay !== null) {
        for (const dayNum of allDayNumbers) {
          if (dayNum > lastCompletedDay) {
            nextDay = dayNum;
            break;
          }
        }
        if (nextDay === null && allDayNumbers.length > 0) {
          nextDay = allDayNumbers[0];
        }
      } else {
        nextDay = allDayNumbers[0];
      }

      setNextDayNumber(nextDay);
    } catch (error) {
      console.error('Ошибка загрузки выполненных дней:', error);
    }
  };

  const isNextDay = (dayNumber: number) => {
    return nextDayNumber === dayNumber;
  };

  const handleStartDay = (day: WorkoutDay) => {
    navigate(coachMode
      ? `/coach/athlete/${routeAthleteId}/workout/${planId}/day/${day.id}`
      : `/athlete/workout/${planId}/day/${day.id}`);
  };

  const toggleDayExercises = (dayId: number) => {
    setExpandedDayIds(current => {
      const next = new Set(current);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  };
  const getExerciseImage = (exercise: any) => {
    // Если есть image_url, используем его
    if (exercise.image_url) {
      return exercise.image_url;
    }
    // Иначе показываем иконку-заглушку
    return null;
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="athlete-plan-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(
          coachMode ? `/coach/athlete/${routeAthleteId}/plans` : '/athlete/dashboard'
        )}>
          <ArrowLeft size={20} />
        </button>
        <h1>{plan?.name}</h1>
      </div>

      <div className="days-list">
        {days.map((day) => (
          <div 
            key={day.id} 
            className={`day-card ${isNextDay(day.day_number) ? 'next-day' : ''}`}
          >
            <div className="day-header">
              <div className="day-number">
                День {day.day_number}
                {isNextDay(day.day_number) && (
                  <span className="next-badge">Следующий</span>
                )}
              </div>
              <button className="start-day-btn" onClick={() => handleStartDay(day)}>
                Начать
              </button>
            </div>
            
            <button
              type="button"
              className="exercises-toggle"
              onClick={() => toggleDayExercises(day.id)}
              aria-expanded={expandedDayIds.has(day.id)}
              aria-controls={`day-exercises-${day.id}`}
              disabled={!day.exercises?.length}
            >
              <span className="exercises-count">
                <Dumbbell size={16} />
                <span>{day.exercises?.length || 0} упражнений</span>
              </span>
              <span className="exercises-toggle-label">
                {expandedDayIds.has(day.id) ? 'Свернуть' : 'Показать'}
                {expandedDayIds.has(day.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </span>
            </button>

            {expandedDayIds.has(day.id) && day.exercises && day.exercises.length > 0 && (
              <div id={`day-exercises-${day.id}`} className="exercises-full-list">
                {day.exercises.map((exercise: any, idx: number) => (
                  <div key={idx} className="exercise-item">
                    <div className="exercise-image">
                      {getExerciseImage(exercise) ? (
                        <img 
                          src={getExerciseImage(exercise)} 
                          alt={exercise.exercise_name}
                          className="exercise-img"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextSibling?.style.removeProperty('display');
                          }}
                        />
                      ) : null}
                      <ImageIcon size={24} className="exercise-img-placeholder" />
                    </div>
                    <div className="exercise-info">
                      <div className="exercise-name">{exercise.exercise_name}</div>
                      <div className="exercise-muscle">{exercise.muscle_group}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
