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

export type AuthStatus = 'loading' | 'found' | 'selection_required' | 'not_found' | 'error';

interface AuthContextType {
  authUser: AuthUser | null;
  profiles: AuthUser[];
  authStatus: AuthStatus;
  selectProfile: (profileId: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  authUser: null,
  profiles: [],
  authStatus: 'loading',
  selectProfile: async () => {},
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
  const [profiles, setProfiles] = useState<AuthUser[]>([]);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  const activateUser = (user: AuthUser, token: string) => {
    setSessionToken(token);
    setAuthUser(user);
    setAuthStatus('found');

    // Обратная совместимость — старые страницы читают выбранный профиль
    // из localStorage.
    if (user.role === 'coach') {
      localStorage.setItem('selectedCoachId', String(user.id));
    } else if (user.role === 'athlete') {
      localStorage.setItem('selectedAthleteId', String(user.id));
    } else if (user.role === 'admin' && user.coach_id) {
      localStorage.setItem('selectedAthleteId', String(user.id));
    }
  };

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

        if (cancelled) return;

        const availableProfiles = (data.data?.profiles || []) as AuthUser[];
        setProfiles(availableProfiles);
        if (data.data?.requiresSelection) {
          setAuthUser(null);
          setAuthStatus('selection_required');
          return;
        }

        const user = data.data?.user as AuthUser;
        if (!user) {
          setAuthStatus('not_found');
          return;
        }

        activateUser(user, data.data.token);
      } catch (error: any) {
        if (!cancelled) setAuthStatus(error.response?.status === 404 ? 'not_found' : 'error');
      }
    };

    run();
    return () => { cancelled = true; };
  }, [initData, startParam]);

  const selectProfile = async (profileId: number) => {
    setAuthStatus('loading');
    try {
      const { data } = await api.post('/auth/telegram', { initData, profileId });
      const user = data.data?.user as AuthUser;
      if (!user || !data.data?.token) throw new Error('Профиль не найден');
      activateUser(user, data.data.token);
    } catch (error) {
      setAuthStatus('selection_required');
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ authUser, profiles, authStatus, selectProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
