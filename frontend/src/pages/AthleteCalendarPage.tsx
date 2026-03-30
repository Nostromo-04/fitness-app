import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Dumbbell } from 'lucide-react';
import athleteService from '../services/athleteService';
import './AthleteCalendarPage.css';

interface CalendarDay {
  emoji?: '👍' | '👎';
  sessions: Array<{
    id: number;
    plan_name: string;
    day_number: number;
  }>;
}

interface WorkoutDetails {
  id: number;
  plan_name: string;
  day_number: number;
  feedback_emoji: '👍' | '👎';
  completed_at: string;
  exercises: Array<{
    exercise_id: number;
    exercise_name: string;
    muscle_group: string;
    sets: Array<{
      set_number: number;
      reps_done: number;
      weight_done: number;
      is_completed: boolean;
    }>;
  }>;
}

export const AthleteCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendar, setCalendar] = useState<Record<number, CalendarDay>>({});
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [workoutDetails, setWorkoutDetails] = useState<WorkoutDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    loadCalendar();
  }, [year, month]);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const athleteId = localStorage.getItem('selectedAthleteId');
      if (!athleteId) {
        console.error('Не выбран спортсмен');
        return;
      }
      const response = await athleteService.getWorkoutCalendar(parseInt(athleteId), year, month);
      console.log('📅 Calendar data from API:', response.data);
      console.log('📅 Calendar entries:', response.data.calendar);
      setCalendar(response.data.calendar || {});
    } catch (error) {
      console.error('❌ Ошибка загрузки календаря:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDayClick = async (day: number) => {
    if (selectedDay === day) {
      setSelectedDay(null);
      setWorkoutDetails(null);
      return;
    }

    setSelectedDay(day);
    setDetailsLoading(true);
    try {
      const athleteId = localStorage.getItem('selectedAthleteId');
      if (!athleteId) {
        console.error('Не выбран спортсмен');
        return;
      }
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      console.log('📅 Загрузка деталей для даты:', dateStr);
      const response = await athleteService.getWorkoutByDate(parseInt(athleteId), dateStr);
      console.log('📅 Workout details:', response.data);
      setWorkoutDetails(response.data);
    } catch (error) {
      console.error('❌ Ошибка загрузки тренировки:', error);
      setWorkoutDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getDaysInMonth = () => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    return new Date(year, month - 1, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
    setSelectedDay(null);
    setWorkoutDetails(null);
    setCalendar({}); // Очищаем календарь
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
    setSelectedDay(null);
    setWorkoutDetails(null);
    setCalendar({}); // Очищаем календарь
  };

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const daysInMonth = getDaysInMonth();
  const firstDay = getFirstDayOfMonth();
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayData = calendar[day];
    days.push(
      <div
        key={day}
        className={`calendar-day ${dayData ? 'has-workout' : ''} ${selectedDay === day ? 'selected' : ''}`}
        onClick={() => dayData && handleDayClick(day)}
      >
        <span className="day-number">{day}</span>
        {dayData && (
          <div className="workout-indicator">
            {dayData.emoji === '👍' ? (
              <span className="dot good" title="Легко">●</span>
            ) : dayData.emoji === '👎' ? (
              <span className="dot bad" title="Тяжело">●</span>
            ) : (
              <span className="dot neutral" title="Нет оценки">●</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="athlete-calendar-page">
      <div className="calendar-header">
        <button className="back-btn" onClick={() => navigate('/athlete/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Календарь тренировок</h1>
      </div>

      <div className="calendar-navigation">
        <button className="nav-btn" onClick={handlePrevMonth}>
          <ChevronLeft size={20} />
        </button>
        <h2>{monthNames[month - 1]} {year}</h2>
        <button className="nav-btn" onClick={handleNextMonth}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="calendar-weekdays">
        <div>Вс</div><div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div>
      </div>

      <div className="calendar-grid">
        {days}
      </div>

      {loading && <div className="loading">Загрузка...</div>}

      {selectedDay && (
        <div className="workout-details">
          <h3>Тренировка {selectedDay} {monthNames[month - 1]}</h3>
          
          {detailsLoading ? (
            <div className="loading">Загрузка...</div>
          ) : workoutDetails ? (
            <div className="workout-info">
              <div className="workout-meta">
                <span className="plan-name">{workoutDetails.plan_name} (День {workoutDetails.day_number})</span>
                <span className={`feedback-badge ${workoutDetails.feedback_emoji === '👍' ? 'good' : 'bad'}`}>
                  {workoutDetails.feedback_emoji === '👍' ? 'Легко' : 'Тяжело'}
                </span>
              </div>

              <div className="exercises-list">
                {workoutDetails.exercises.map((exercise, idx) => (
                  <div key={idx} className="exercise-card">
                    <h4>{exercise.exercise_name}</h4>
                    <p className="muscle-group">{exercise.muscle_group}</p>
                    
                    <div className="sets-grid">
                      <div className="sets-header">
                        <span>Подход</span>
                        <span>Повторы</span>
                        <span>Вес (кг)</span>
                      </div>
                      {exercise.sets.map((set, setIdx) => (
                        <div key={setIdx} className="set-row">
                          <span>{set.set_number}</span>
                          <span>{set.reps_done}</span>
                          <span>{set.weight_done}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="no-data">Нет данных о тренировке</p>
          )}
        </div>
      )}
    </div>
  );
};