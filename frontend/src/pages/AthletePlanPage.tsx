import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Dumbbell, CheckCircle } from 'lucide-react';
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
  const [nextDayNumber, setNextDayNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planId) {
      loadPlanDetails();
    }
  }, [planId]);

  // Загружаем выполненные дни после того, как план загружен
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
      const athleteId = localStorage.getItem('selectedAthleteId');
      if (!athleteId) {
        console.error('Не выбран спортсмен');
        return;
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      console.log('Загрузка календаря для спортсмена:', athleteId);
      console.log('План ID:', planId);
      console.log('Название плана:', plan?.name);
      console.log('ID текущего плана для фильтрации:', plan.id);

      let allSessions: any[] = [];

      // Загружаем текущий месяц (май 2026)
      try {
        const calendarResponse = await athleteService.getWorkoutCalendar(parseInt(athleteId), currentYear, currentMonth);
        const calendar = calendarResponse.data.calendar || {};
        
        for (const dayKey in calendar) {
          const sessions = calendar[dayKey]?.sessions || [];
          allSessions = [...allSessions, ...sessions];
        }
        console.log(`Загружены данные за ${currentMonth}.${currentYear}:`, allSessions.length);
      } catch (error) {
        console.log(`Ошибка загрузки данных за ${currentMonth}.${currentYear}:`, error);
      }

      // Загружаем март 2026 (вместо апреля, который возвращает 500)
      let marchMonth = 3;
      let marchYear = currentYear;
      
      try {
        const marchCalendarResponse = await athleteService.getWorkoutCalendar(parseInt(athleteId), marchYear, marchMonth);
        const marchCalendar = marchCalendarResponse.data.calendar || {};
        
        for (const dayKey in marchCalendar) {
          const sessions = marchCalendar[dayKey]?.sessions || [];
          allSessions = [...allSessions, ...sessions];
        }
        console.log(`Загружены данные за ${marchMonth}.${marchYear}:`, allSessions.length);
      } catch (error) {
        console.log(`Ошибка загрузки данных за ${marchMonth}.${marchYear}:`, error);
      }

      console.log('Все сессии (сырые):', allSessions);
      console.log('ID текущего плана для фильтрации:', plan.id);

      // Выводим plan_id каждой сессии для отладки
      allSessions.forEach((session: any, idx: number) => {
        console.log(`Сессия ${idx + 1}: plan_id=${session.plan_id}, plan_name=${session.plan_name}, day=${session.day_number}, workout_date=${session.workout_date}`);
      });

      // Фильтруем сессии для этого плана и сортируем по дате
      const planSessions = allSessions
        .filter((session: any) => session.plan_id === plan.id)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.workout_date);
          const dateB = new Date(b.workout_date);
          return dateB.getTime() - dateA.getTime();
        });

      console.log('Сессии плана (отсортированы по дате):', planSessions);

      // Находим последнюю выполненную тренировку
      let lastCompletedDay = null;
      let lastSessionDate = null;
      
      if (planSessions.length > 0) {
        const lastSession = planSessions[0];
        lastCompletedDay = lastSession.day_number;
        lastSessionDate = lastSession.workout_date;
      }

      console.log('Последний выполненный день:', lastCompletedDay, 'дата:', lastSessionDate);

      // Определяем следующий день (циклично)
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
          console.log('Цикл: начинаем с первого дня');
        }
      } else {
        nextDay = allDayNumbers[0];
        console.log('Нет выполненных тренировок, начинаем с первого дня');
      }

      console.log('Следующий день для выделения:', nextDay);
      setNextDayNumber(nextDay);
    } catch (error) {
      console.error('Ошибка загрузки выполненных дней:', error);
    }
  };

  const isNextDay = (dayNumber: number) => {
    return nextDayNumber === dayNumber;
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
            className={`day-card ${isNextDay(day.day_number) ? 'next-day' : ''}`}
            onClick={() => handleStartDay(day)}
          >
            <div className="day-number">
              День {day.day_number}
              {isNextDay(day.day_number) && (
                <span className="next-badge">Следующая</span>
              )}
            </div>
            
            <div className="day-info">
              <div className="exercises-count">
                <Dumbbell size={16} />
                <span>{day.exercises?.length || 0} упражнений</span>
              </div>
              
              <button className="start-day-btn">
                Начать
              </button>
            </div>

            {day.exercises && (
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