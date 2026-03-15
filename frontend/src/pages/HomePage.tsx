import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Calendar, Users } from 'lucide-react';
import './HomePage.css';

interface HomePageProps {
  user?: any;
}

export const HomePage: React.FC<HomePageProps> = ({ user }) => {
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="home-container">
        <div className="welcome-card">
          <Dumbbell size={48} className="logo-icon" />
          <h1>Fitness App</h1>
          <p>Тренируйся эффективно с персональным тренером</p>
          <button className="primary-button" onClick={() => navigate('/login')}>
            Начать
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="user-header">
        <h2>Привет, {user.first_name}! 👋</h2>
      </div>
      
      <div className="menu-grid">
        <div className="menu-card" onClick={() => navigate('/workouts')}>
          <Calendar size={32} />
          <h3>Мои тренировки</h3>
        </div>
        
        <div className="menu-card" onClick={() => navigate('/exercises')}>
          <Dumbbell size={32} />
          <h3>Упражнения</h3>
        </div>
        
        <div className="menu-card" onClick={() => navigate('/progress')}>
          <Users size={32} />
          <h3>Прогресс</h3>
        </div>
      </div>
    </div>
  );
};