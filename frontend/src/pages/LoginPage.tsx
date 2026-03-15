import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Выберите роль</h2>
        <p>Продолжите как:</p>
        
        <button 
          className="role-button coach"
          onClick={() => navigate('/coach/dashboard')}
        >
          <span className="emoji">👨‍🏫</span>
          <span className="title">Тренер</span>
          <span className="description">Создавайте планы и следите за прогрессом</span>
        </button>
        
        <button 
          className="role-button athlete"
          onClick={() => navigate('/athlete/dashboard')}
        >
          <span className="emoji">🏃</span>
          <span className="title">Спортсмен</span>
          <span className="description">Выполняйте тренировки и отслеживайте результаты</span>
        </button>
      </div>
    </div>
  );
};