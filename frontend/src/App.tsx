import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { useTelegram } from './hooks/useTelegram';
import { AuthProvider, useAuth } from './context/AuthContext';

import { CoachDashboard } from './pages/CoachDashboard';
import { AthleteDashboard } from './pages/AthleteDashboard';
import { HomePage } from './pages/HomePage';
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

// ──────────────────────────────────────────────────────────────────────
// Экран загрузки
// ──────────────────────────────────────────────────────────────────────
const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Загрузка…' }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: 16,
    background: 'var(--fit-bg, #0a0a0c)',
    color: 'var(--fit-muted, #a1a1aa)',
    fontFamily: 'system-ui, sans-serif',
  }}>
    <div style={{
      width: 36, height: 36,
      border: '3px solid #27272a',
      borderTopColor: '#a3e635',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <span style={{ fontSize: 14 }}>{message}</span>
  </div>
);

// ──────────────────────────────────────────────────────────────────────
// Экран «не зарегистрирован»
// ──────────────────────────────────────────────────────────────────────
const NotRegisteredScreen: React.FC = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: 12,
    padding: 24,
    background: 'var(--fit-bg, #0a0a0c)',
    color: 'var(--fit-text, #f4f4f5)',
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center',
  }}>
    <div style={{ fontSize: 48 }}>🏋️</div>
    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Аккаунт не найден</h2>
    <p style={{ margin: 0, fontSize: 14, color: 'var(--fit-muted, #a1a1aa)', lineHeight: 1.5 }}>
      Вас ещё нет в системе. Обратитесь к тренеру — он добавит вас и пришлёт ссылку.
    </p>
  </div>
);

// ──────────────────────────────────────────────────────────────────────
// Защищённый маршрут — проверяет роль из AuthContext
// ──────────────────────────────────────────────────────────────────────
const RequireRole: React.FC<{
  role: 'coach' | 'athlete' | 'admin';
  children: React.ReactNode;
}> = ({ role, children }) => {
  const { authUser, authStatus } = useAuth();

  if (authStatus === 'loading') return <LoadingScreen />;
  if (!authUser || authUser.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// ──────────────────────────────────────────────────────────────────────
// Корневой маршрут — роутинг по роли
// ──────────────────────────────────────────────────────────────────────
const RootRedirect: React.FC = () => {
  const { authUser, authStatus } = useAuth();

  if (authStatus === 'loading') return <LoadingScreen message="Авторизация…" />;

  if (authStatus === 'not_found') return <NotRegisteredScreen />;
  if (authStatus === 'error')    return <NotRegisteredScreen />;

  if (!authUser) return <NotRegisteredScreen />;

  switch (authUser.role) {
    case 'coach':   return <Navigate to="/coach/dashboard"   replace />;
    case 'athlete': return <Navigate to="/athlete/dashboard" replace />;
    case 'admin':   return <Navigate to="/home"              replace />;
    default:        return <NotRegisteredScreen />;
  }
};

// ──────────────────────────────────────────────────────────────────────
// Роутер
// ──────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Корень — определяет куда идти по роли */}
        <Route path="/" element={<RootRedirect />} />

        {/* Маршруты тренера */}
        <Route path="/coach/dashboard" element={
          <RequireRole role="coach"><CoachDashboard /></RequireRole>
        } />
        <Route path="/coach/exercises" element={
          <RequireRole role="coach"><ExerciseLibrary /></RequireRole>
        } />
        <Route path="/coach/create-plan" element={
          <RequireRole role="coach"><CreatePlanPage /></RequireRole>
        } />
        <Route path="/coach/athlete/:athleteId/calendar" element={
          <RequireRole role="coach"><CoachAthleteCalendarPage /></RequireRole>
        } />
        <Route path="/coach/athlete/:athleteId/progress" element={
          <RequireRole role="coach"><CoachAthleteProgressPage /></RequireRole>
        } />
        <Route path="/coach/athlete/:athleteId/plans" element={
          <RequireRole role="coach"><CoachAthletePlansPage /></RequireRole>
        } />
        <Route path="/coach/edit-plan/:planId" element={
          <RequireRole role="coach"><CoachEditPlanPage /></RequireRole>
        } />

        {/* Маршруты спортсмена */}
        <Route path="/athlete/dashboard" element={
          <RequireRole role="athlete"><AthleteDashboard /></RequireRole>
        } />
        <Route path="/athlete/plan/:planId" element={
          <RequireRole role="athlete"><AthletePlanPage /></RequireRole>
        } />
        <Route path="/athlete/workout/:planId/day/:dayId" element={
          <RequireRole role="athlete"><AthleteWorkoutPage /></RequireRole>
        } />
        <Route path="/athlete/complete" element={
          <RequireRole role="athlete"><AthleteCompletePage /></RequireRole>
        } />
        <Route path="/athlete/calendar" element={
          <RequireRole role="athlete"><AthleteCalendarPage /></RequireRole>
        } />
        <Route path="/athlete/progress" element={
          <RequireRole role="athlete"><AthleteProgressPage /></RequireRole>
        } />

        {/* /admin не нужен: admin → /home через RootRedirect */}

        {/* Стартовый экран (для admin и новых пользователей) */}
        <Route path="/home" element={<HomePage />} />

        {/* Служебные */}
        <Route path="/select-user" element={<UserSelectionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Точка входа
// ──────────────────────────────────────────────────────────────────────
function App() {
  const { isReady, telegramId } = useTelegram();

  if (!isReady) return <LoadingScreen />;

  return (
    <AppRoot>
      <AuthProvider telegramId={telegramId}>
        <AppRoutes />
      </AuthProvider>
    </AppRoot>
  );
}

export default App;
