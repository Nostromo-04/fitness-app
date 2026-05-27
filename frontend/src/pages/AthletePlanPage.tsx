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
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [nextDayNumber, setNextDayNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planId) {
      loadPlanDetails();
    }
  }, [planId]);

  // Загружаем выполненные дни после того, как план загружен (чтобы знать plan_id)
  useEffect(() => {
    if (plan && planId) {
      loadCompletedDays();
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

  const loadCompletedDays = async () => {
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

      let allCalendar = {};

      // Загружаем текущий месяц
      try {
        const calendarResponse = await athleteService.getWorkoutCalendar(parseInt(athleteId), year, month);
        allCalendar = { ...calendarResponse.data.calendar };
      } catch (error) {
        console.log(`Нет данных за ${month}.${year}`);
      }

      // Загружаем предыдущий месяц (на случай, если тренировка была в прошлом месяце)
      let prevMonth = month - 1;
      let prevYear = year;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear--;
      }
      
      try {
        const prevCalendarResponse = await athleteService.getWorkoutCalendar(parseInt(athleteId), prevYear, prevMonth);
        allCalendar = { ...prevCalendarResponse.data.calendar, ...allCalendar };
      } catch (error) {
        console.log(`Нет данных за ${prevMonth}.${prevYear}`);
      }

      console.log('Календарь:', allCalendar);

      // Собираем все выполненные дни для этого плана
      const completed: number[] = [];

      for (const dayKey in allCalendar) {
        const sessions = allCalendar[dayKey]?.sessions || [];
        sessions.forEach((session: any) => {
          console.log(`Сессия: plan_id=${session.plan_id}, plan_name=${session.plan_name}, day=${session.day_number}`);
          // Сравниваем по plan_id (более надежно)
          if (session.plan_id === plan.id) {
            const dayNumber = session.day_number;
            if (!completed.includes(dayNumber)) {
              completed.push(dayNumber);
              console.log(`Добавлен выполненный день: ${dayNumber}`);
            }
          }
        });
      }

      setCompletedDays(completed);
      console.log('Выполненные дни:', completed);

      // Определяем следующий день
      const allDayNumbers = days.map(d => d.day_number).sort((a, b) => a - b);
      console.log('Все дни плана:', allDayNumbers);
      
      let nextDay = null;

      for (const dayNum of allDayNumbers) {
        if (!completed.includes(dayNum)) {
          nextDay = dayNum;
          break;
        }
      }

      // Если все дни выполнены, начинаем цикл с первого дня
      if (nextDay === null && allDayNumbers.length > 0) {
        nextDay = allDayNumbers[0];
        console.log('Все дни выполнены, начинаем цикл с дня:', nextDay);
      }

      console.log('Следующий день:', nextDay);
      setNextDayNumber(nextDay);
    } catch (error) {
      console.error('Ошибка загрузки выполненных дней:', error);
    }
  };

  const isDayCompleted = (dayNumber: number) => {
    return completedDays.includes(dayNumber);
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
            className={`day-card ${isDayCompleted(day.day_number) ? 'completed' : ''} ${isNextDay(day.day_number) ? 'next-day' : ''}`}
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