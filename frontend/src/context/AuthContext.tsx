import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { setSessionToken } from '../services/api';
import { normalizeInviteToken } from '../utils/inviteToken';

export interface AuthUser {
  id: number;
  role: 'coach' | 'athlete' | 'admin';
  first_name: string;
  last_name?: string;
  coach_id?: number;
  telegram_id: string;
}

export type AuthStatus = 'loading' | 'found' | 'not_found' | 'error';

interface AuthContextType {
  authUser: AuthUser | null;
  authStatus: AuthStatus;
  setAuthUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType>({
  authUser: null,
  authStatus: 'loading',
  setAuthUser: () => {},
});

/**
 * Читает start_param из Telegram WebApp.
 * Формат: "invite_<случайный токен>" → возвращает токен.
 */
export const AuthProvider: React.FC<{
  initData: string;
  startParam: string;
  children: React.ReactNode;
}> = ({ initData, startParam, children }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    if (!initData) {
      setAuthStatus('not_found');
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        setSessionToken(null);
        const { data } = await api.post('/auth/telegram', {
          initData,
          inviteToken: normalizeInviteToken(startParam),
        });
        const user = data.data.user as AuthUser;
        setSessionToken(data.data.token);

        if (cancelled) return;

        if (!user) {
          setAuthStatus('not_found');
          return;
        }

        setAuthUser(user);
        setAuthStatus('found');

        // Обратная совместимость — старые страницы читают из localStorage
        if (user.role === 'coach') {
          localStorage.setItem('selectedCoachId', String(user.id));
        } else if (user.role === 'athlete') {
          localStorage.setItem('selectedAthleteId', String(user.id));
        } else if (user.role === 'admin' && user.coach_id) {
          // Админ, тренирующийся у тренера — может также просматривать
          // свой дашборд спортсмена
          localStorage.setItem('selectedAthleteId', String(user.id));
        }
      } catch (error: any) {
        if (!cancelled) setAuthStatus(error.response?.status === 404 ? 'not_found' : 'error');
      }
    };

    run();
    return () => { cancelled = true; };
  }, [initData, startParam]);

  return (
    <AuthContext.Provider value={{ authUser, authStatus, setAuthUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
