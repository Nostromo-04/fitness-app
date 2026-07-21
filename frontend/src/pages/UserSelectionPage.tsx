import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Dumbbell, ArrowLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import './UserSelectionPage.css';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  role: 'coach' | 'athlete' | 'admin';
  telegram_id?: string;
  phone?: string;
  coach_id?: number;
}

export const UserSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState<'coach' | 'athlete' | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (role) {
      loadUsers();
    }
  }, [role]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      const allUsers = response.data.data || [];
      // Admin users with coach_id also appear in the athlete list
      const filteredUsers = allUsers.filter((u: User) =>
        u.role === role || (role === 'athlete' && u.role === 'admin' && u.coach_id != null)
      );
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user: User) => {
    if (user.role === 'coach') {
      localStorage.setItem('selectedCoachId', user.id.toString());
      navigate('/coach/dashboard');
    } else {
      localStorage.setItem('selectedAthleteId', user.id.toString());
      navigate('/athlete/dashboard');
    }
  };

  if (!role) {
    return (
      <div className="user-selection-page">
        <div className="role-selection">
          <h1>Кто вы?</h1>
          <div className="role-buttons">
            <button className="role-btn coach" onClick={() => setRole('coach')}>
              <Users size={48} />
              <span>Тренер</span>
            </button>
            <button className="role-btn athlete" onClick={() => setRole('athlete')}>
              <Dumbbell size={48} />
              <span>Спортсмен</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-selection-page">
      <div className="user-list-container">
        <div className="user-list-header">
          <button className="back-btn" onClick={() => setRole(null)}>
            <ArrowLeft size={20} />
          </button>
          <h1>{role === 'coach' ? 'Выберите тренера' : 'Выберите спортсмена'}</h1>
        </div>

        {loading ? (
          <div className="loading">Загрузка...</div>
        ) : users.length > 0 ? (
          <div className="user-list">
            {users.map((user) => (
              <div
                key={user.id}
                className="user-card"
                onClick={() => handleUserSelect(user)}
              >
                <div className="user-avatar">
                  ID:{user.id}
                </div>
                <div className="user-info">
                  <h3>{user.first_name} {user.last_name}</h3>
                </div>
                <div className="user-card-arrow">
                  <ChevronRight size={18} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>Нет {role === 'coach' ? 'тренеров' : 'спортсменов'}</p>
          </div>
        )}
      </div>
    </div>
  );
};
