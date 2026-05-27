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
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      console.log('Загрузка календаря для спортсмена:', athleteId);
      console.log('План ID:', planId);
      console.log('Название плана:', plan?.name);

      let allSessions: any[] = [];

      // Загружаем текущий месяц
      try {
        const calendarResponse = await athleteService.getWorkoutCalendar(parseInt(athleteId), year, month);
        const calendar = calendarResponse.data.calendar || {};
        
        for (const dayKey in calendar) {
          const sessions = calendar[dayKey]?.sessions || [];
          allSessions = [...allSessions, ...sessions];
        }
      } catch (error) {
        console.log(`Нет данных за ${month}.${year}`);
      }

      // Загружаем предыдущий месяц
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear--;
      }
      
      try {
        const prevCalendarResponse = await athleteService.getWorkoutCalendar(parseInt(athleteId), prevYear, prevMonth);
        const prevCalendar = prevCalendarResponse.data.calendar || {};
        
        for (const dayKey in prevCalendar) {
          const sessions = prevCalendar[dayKey]?.sessions || [];
          allSessions = [...allSessions, ...sessions];
        }
      } catch (error) {
        console.log(`Нет данных за ${prevMonth}.${prevYear}`);
      }

      console.log('Все сессии:', allSessions);

      // Находим последнюю выполненную тренировку для этого плана
      const planSessions = allSessions
        .filter((session: any) => session.plan_id === plan.id)
        .sort((a: any, b: any) => {
          // Сортируем по дате (более новые сначала)
          // Нужно добавить поле date к сессиям или использовать существующее
          return 0; // TODO: сортировка по дате
        });

      console.log('Сессии плана:', planSessions);

      // Находим последний выполненный день
      let lastCompletedDay = null;
      
      // Проходим по всем дням в поисках самого большого номера выполненного дня
      for (const session of planSessions) {
        const dayNumber = session.day_number;
        if (lastCompletedDay === null || dayNumber > lastCompletedDay) {
          lastCompletedDay = dayNumber;
        }
      }

      console.log('Последний выполненный день:', lastCompletedDay);

      // Определяем следующий день (циклично)
      const allDayNumbers = days.map(d => d.day_number).sort((a, b) => a - b);
      let nextDay = null;

      if (lastCompletedDay !== null) {
        // Ищем следующий день после последнего выполненного
        for (const dayNum of allDayNumbers) {
          if (dayNum > lastCompletedDay) {
            nextDay = dayNum;
            break;
          }
        }
        // Если не нашли (последний день был максимальным), берем первый день
        if (nextDay === null && allDayNumbers.length > 0) {
          nextDay = allDayNumbers[0];
          console.log('Цикл: начинаем с первого дня');
        }
      } else {
        // Если нет выполненных тренировок, начинаем с первого дня
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