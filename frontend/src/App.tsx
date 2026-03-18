import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useTelegram } from './hooks/useTelegram';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { CoachDashboard } from './pages/CoachDashboard';
import { AthleteDashboard } from './pages/AthleteDashboard';
import { ExerciseLibrary } from './pages/ExerciseLibrary';
import { CreatePlanPage } from './pages/CreatePlanPage';
import { AthletePlanPage } from './pages/AthletePlanPage';
import { AthleteWorkoutPage } from './pages/AthleteWorkoutPage';
import { AthleteCompletePage } from './pages/AthleteCompletePage';
import { AthleteCalendarPage } from './pages/AthleteCalendarPage';

import '@telegram-apps/telegram-ui/dist/styles.css';
import './App.css';

function App() {
  const { isReady, user } = useTelegram();

  if (!isReady) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--tg-theme-bg-color, #ffffff)',
        color: 'var(--tg-theme-text-color, #000000)'
      }}>
        Загрузка...
      </div>
    );
  }

  return (
    <AppRoot>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/coach/dashboard" element={<CoachDashboard />} />
          <Route path="/athlete/dashboard" element={<AthleteDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/coach/exercises" element={<ExerciseLibrary />} />
          <Route path="/coach/create-plan" element={<CreatePlanPage />} />
          <Route path="/athlete/plan/:planId" element={<AthletePlanPage />} />
          <Route path="/athlete/workout/:planId/day/:dayId" element={<AthleteWorkoutPage />} />
          <Route path="/athlete/complete" element={<AthleteCompletePage />} />
          <Route path="/athlete/calendar" element={<AthleteCalendarPage />} />
        </Routes>
      </Router>
    </AppRoot>
  );
}

export default App;