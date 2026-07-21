import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Dumbbell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { authUser } = useAuth();

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-badge">
          <Shield size={20} />
          Администратор
        </div>
        <h1>Добро пожаловать,<br />{authUser?.first_name}!</h1>
        <p>Выберите раздел для управления</p>
      </div>

      <div className="admin-cards">
        <button className="admin-card" onClick={() => navigate('/select-user')}>
          <div className="admin-card-icon">
            <Users size={28} />
          </div>
          <div className="admin-card-info">
            <h3>Управление пользователями</h3>
            <p>Тренеры, спортсмены, роли</p>
          </div>
          <span className="admin-card-arrow">›</span>
        </button>

        <button className="admin-card" onClick={() => navigate('/coach/exercises')}>
          <div className="admin-card-icon">
            <Dumbbell size={28} />
          </div>
          <div className="admin-card-info">
            <h3>Библиотека упражнений</h3>
            <p>Добавить и редактировать упражнения</p>
          </div>
          <span className="admin-card-arrow">›</span>
        </button>
      </div>

      <button className="admin-start-btn" onClick={() => navigate('/select-user')}>
        Начать
      </button>
    </div>
  );
};
