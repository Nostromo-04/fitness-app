import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { useTelegram } from './hooks/useTelegram';
import { AuthProvider, useAuth } from './context/AuthContext';
import { inviteLinkFromStartParam, normalizeInviteToken } from './utils/inviteToken';

import { CoachDashboard } from './pages/CoachDashboard';
import { AthleteDashboard } from './pages/AthleteDashboard';
import { HomePage } from './pages/HomePage';
import { AdminDashboard } from './pages/AdminDashboard';
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

const ProfileSelectionScreen: React.FC = () => {
  const { profiles, selectProfile } = useAuth();
  const [error, setError] = useState('');
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const roleLabels = {
    admin: { title: 'Администратор', emoji: '🛡️' },
    coach: { title: 'Тренер', emoji: '👨‍🏫' },
    athlete: { title: 'Спортсмен', emoji: '🏋️' },
  };

  const handleSelect = async (profileId: number) => {
    setError('');
    setSelectingId(profileId);
    try {
      await selectProfile(profileId);
    } catch {
      setError('Не удалось выбрать профиль. Закройте приложение и откройте его снова.');
      setSelectingId(null);
    }
  };

  return (
    <div className="profile-selection-screen">
      <div className="profile-selection-card">
        <h1>Кто вы?</h1>
        <p>Выберите, как хотите войти в приложение</p>
        <div className="profile-selection-options">
          {profiles.map(profile => {
            const role = roleLabels[profile.role];
            return (
              <button
                key={profile.id}
                className={`profile-selection-button ${profile.role}`}
                disabled={selectingId !== null}
                onClick={() => handleSelect(profile.id)}
              >
                <span className="profile-selection-emoji">{role.emoji}</span>
                <span className="profile-selection-title">{role.title}</span>
                <span className="profile-selection-name">
                  {[profile.first_name, profile.last_name].filter(Boolean).join(' ')}
                </span>
              </button>
            );
          })}
        </div>
        {error && <p className="profile-selection-error">{error}</p>}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────
// Экран «не зарегистрирован» с вводом кода приглашения
// ──────────────────────────────────────────────────────────────────────
const NotRegisteredScreen: React.FC<{
  telegramId?: string | null;
  startParam?: string;
}> = ({ telegramId, startParam = '' }) => {
  const [code, setCode]     = useState(() => inviteLinkFromStartParam(startParam));
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const handleLink = async () => {
    if (!telegramId) {
      setErrMsg('Telegram ID не определён. Откройте приложение через бота.');
      setStatus('error');
      return;
    }
    const inviteToken = normalizeInviteToken(code);
    if (!inviteToken) {
      setErrMsg('Неверный код. Вставьте ссылку-приглашение от тренера.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const API = import.meta.env.VITE_API_URL ?? 'https://fitness-app-production-33d3.up.railway.app/api';
      const initData = (window as any).Telegram?.WebApp?.initData || '';
      const res = await fetch(`${API}/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, inviteToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message ?? `Ошибка ${res.status}`);
      }
      if (data.data?.token) sessionStorage.setItem('fitnessAppSession', data.data.token);
      window.location.reload();
    } catch (e: any) {
      setErrMsg(e.message ?? 'Ошибка сервера');
      setStatus('error');
    }
  };

  const s = {
    page: {
      display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', gap: 16, padding: 24,
      background: 'var(--fit-bg, #0a0a0c)',
      color: 'var(--fit-text, #f4f4f5)',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center' as const,
    },
    card: {
      width: '100%', maxWidth: 340,
      background: '#18181b', border: '1px solid #27272a',
      borderRadius: 16, padding: 20,
      display: 'flex', flexDirection: 'column' as const, gap: 12,
    },
    input: {
      width: '100%', padding: '12px 14px',
      background: '#0a0a0c', border: '1px solid #27272a',
      borderRadius: 10, color: '#f4f4f5',
      fontSize: 14, outline: 'none',
      boxSizing: 'border-box' as const,
    },
    btn: {
      width: '100%', padding: '13px 0',
      background: status === 'loading' ? '#4d6e1a' : '#a3e635',
      color: '#0a0a0c', border: 'none',
      borderRadius: 10, fontSize: 15, fontWeight: 700,
      cursor: status === 'loading' ? 'default' : 'pointer',
    },
  };

  return (
    <div style={s.page}>
      <div style={{ fontSize: 48 }}>🏋️</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Аккаунт не найден</h2>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--fit-muted, #a1a1aa)', lineHeight: 1.5 }}>
        Вставьте ссылку или код, который прислал тренер
      </p>

      <div style={s.card}>
        <label style={{ fontSize: 13, color: '#a1a1aa', textAlign: 'left' }}>
          Вставьте здесь
        </label>
        <input
          style={s.input}
          placeholder="https://t.me/kablaev_team_bot?startapp=invite_..."
          value={code}
          onChange={e => { setCode(e.target.value); setStatus('idle'); }}
        />
        {status === 'error' && (
          <p style={{ margin: 0, fontSize: 13, color: '#f87171', textAlign: 'left' }}>{errMsg}</p>
        )}
        <button style={s.btn} onClick={handleLink} disabled={status === 'loading'}>
          {status === 'loading' ? 'Подключение…' : 'Войти'}
        </button>
      </div>

      {telegramId && (
        <p style={{ fontSize: 12, color: '#52525b', margin: 0 }}>
          Ваш Telegram ID: <strong style={{ color: '#a3e635' }}>{telegramId}</strong>
        </p>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────
// Защищённый маршрут — проверяет роль из AuthContext
// ──────────────────────────────────────────────────────────────────────
const RequireRole: React.FC<{
  role: 'coach' | 'athlete' | 'admin';
  children: React.ReactNode;
}> = ({ role, children }) => {
  const { authUser, authStatus } = useAuth();

  if (authStatus === 'loading') return <LoadingScreen />;
  if (!authUser) return <Navigate to="/" replace />;
  // Администратор имеет доступ к любому маршруту
  if (authUser.role !== role && authUser.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
};

// ──────────────────────────────────────────────────────────────────────
// Корневой маршрут — роутинг по роли
// ──────────────────────────────────────────────────────────────────────
const RootRedirect: React.FC = () => {
  const { authUser, authStatus } = useAuth();
  const { telegramId, startParam } = useTelegram();

  if (authStatus === 'loading') return <LoadingScreen message="Авторизация…" />;
  if (authStatus === 'selection_required') return <ProfileSelectionScreen />;

  if (authStatus === 'not_found') {
    return <NotRegisteredScreen telegramId={telegramId} startParam={startParam} />;
  }
  if (authStatus === 'error') {
    return <NotRegisteredScreen telegramId={telegramId} startParam={startParam} />;
  }

  if (!authUser) return <NotRegisteredScreen />;

  switch (authUser.role) {
    case 'coach':   return <Navigate to="/coach/dashboard"   replace />;
    case 'athlete': return <Navigate to="/athlete/dashboard" replace />;
    case 'admin':   return <Navigate to="/admin/dashboard"   replace />;
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

        {/* Панель администратора */}
        <Route path="/admin/dashboard" element={
          <RequireRole role="admin"><AdminDashboard /></RequireRole>
        } />

        {/* Стартовый экран (legacy) */}
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
  const { isReady, initData, startParam } = useTelegram();

  if (!isReady) return <LoadingScreen />;

  return (
    <AppRoot>
      <AuthProvider initData={initData} startParam={startParam}>
        <AppRoutes />
      </AuthProvider>
    </AppRoot>
  );
}

export default App;
