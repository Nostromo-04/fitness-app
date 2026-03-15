import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Dumbbell, Calendar, PlusCircle, BarChart } from 'lucide-react';
import api from '../services/api';
import './CoachDashboard.css';

interface Athlete {
  id: number;
  first_name: string;
  last_name?: string;
  phone?: string;
}

export const CoachDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAthletes();
  }, []);

  const fetchAthletes = async () => {
    try {
      // Временно используем ID тренера = 1
      const response = await api.get('/users/coach/1/athletes');
      setAthletes(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки спортсменов:', error);
    } finally {
      setLoading(false);
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
            <span className="stat-label">Спортсменов</span>
          </div>
        </div>

        <div className="stat-card">
          <Dumbbell size={24} />
          <div className="stat-info">
            <span className="stat-value">0</span>
            <span className="stat-label">Планов</span>
          </div>
        </div>

        <div className="stat-card">
          <Calendar size={24} />
          <div className="stat-info">
            <span className="stat-value">0</span>
            <span className="stat-label">Тренировок</span>
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
              <div 
                key={athlete.id} 
                className="athlete-card"
                onClick={() => navigate(`/coach/athlete/${athlete.id}`)}
              >
                <div className="athlete-avatar">
                  {athlete.first_name[0]}
                  {athlete.last_name?.[0]}
                </div>
                <div className="athlete-info">
                  <h3>{athlete.first_name} {athlete.last_name}</h3>
                  <p>{athlete.phone || 'Нет телефона'}</p>
                </div>
                <BarChart size={20} className="athlete-icon" />
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