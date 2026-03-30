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
import { AthleteProgressPage } from './pages/AthleteProgressPage';
import { CoachAthleteCalendarPage } from './pages/CoachAthleteCalendarPage';
import { CoachAthleteProgressPage } from './pages/CoachAthleteProgressPage';
import { UserSelectionPage } from './pages/UserSelectionPage';
import { CoachAthletePlansPage } from './pages/CoachAthletePlansPage';
import { CoachEditPlanPage } from './pages/CoachEditPlanPage';

import '@telegram-apps/telegram-ui/dist/styles.css';
import './App.css';

// Компонент-обертка для защиты маршрутов
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  role: 'coach' | 'athlete';
}> = ({ children, role }) => {
  const storageKey = role === 'coach' ? 'selectedCoachId' : 'selectedAthleteId';
  const userId = localStorage.getItem(storageKey);
  
  if (!userId) {
    return <Navigate to="/select-user" replace />;
  }
  
  return <>{children}</>;
};

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
          {/* Публичные маршруты */}
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/select-user" element={<UserSelectionPage />} />
          
          {/* Маршруты тренера (защищенные) */}
          <Route path="/coach/dashboard" element={
            <ProtectedRoute role="coach">
              <CoachDashboard />
            </ProtectedRoute>
          } />
          <Route path="/coach/exercises" element={
            <ProtectedRoute role="coach">
              <ExerciseLibrary />
            </ProtectedRoute>
          } />
          <Route path="/coach/create-plan" element={
            <ProtectedRoute role="coach">
              <CreatePlanPage />
            </ProtectedRoute>
          } />
          <Route path="/coach/athlete/:athleteId/calendar" element={
            <ProtectedRoute role="coach">
              <CoachAthleteCalendarPage />
            </ProtectedRoute>
          } />
          <Route path="/coach/athlete/:athleteId/progress" element={
            <ProtectedRoute role="coach">
              <CoachAthleteProgressPage />
            </ProtectedRoute>
          } />
          
          {/* Маршруты спортсмена (защищенные) */}
          <Route path="/athlete/dashboard" element={
            <ProtectedRoute role="athlete">
              <AthleteDashboard />
            </ProtectedRoute>
          } />
          <Route path="/athlete/plan/:planId" element={
            <ProtectedRoute role="athlete">
              <AthletePlanPage />
            </ProtectedRoute>
          } />
          <Route path="/athlete/workout/:planId/day/:dayId" element={
            <ProtectedRoute role="athlete">
              <AthleteWorkoutPage />
            </ProtectedRoute>
          } />
          <Route path="/athlete/complete" element={
            <ProtectedRoute role="athlete">
              <AthleteCompletePage />
            </ProtectedRoute>
          } />
          <Route path="/athlete/calendar" element={
            <ProtectedRoute role="athlete">
              <AthleteCalendarPage />
            </ProtectedRoute>
          } />
          <Route path="/athlete/progress" element={
            <ProtectedRoute role="athlete">
              <AthleteProgressPage />
            </ProtectedRoute>
          } />
          <Route path="/coach/athlete/:athleteId/plans" element={
            <CoachAthletePlansPage />
          } />
          <Route path="/coach/edit-plan/:planId" element={
            <CoachEditPlanPage />
          } />

          {/* Перенаправление для старых маршрутов */}
          <Route path="/login" element={<Navigate to="/select-user" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AppRoot>
  );
}

export default App;