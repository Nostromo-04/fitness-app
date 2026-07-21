import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

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
 * Формат: "athlete_123" → возвращает 123
 * Иначе → null
 */
function getAthleteIdFromStartParam(): number | null {
  const param: string = (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param ?? '';
  const match = param.match(/^athlete_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

export const AuthProvider: React.FC<{
  telegramId: string | null;
  children: React.ReactNode;
}> = ({ telegramId, children }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    if (!telegramId) {
      setAuthStatus('not_found');
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        // ── Шаг 1: пробуем найти пользователя по telegram_id ──────────────
        let user: AuthUser | null = null;

        try {
          const { data } = await api.get(`/auth/telegram/${telegramId}`);
          user = data.data as AuthUser;
        } catch (err: any) {
          if (err.response?.status !== 404) throw err; // неожиданная ошибка
          // user === null → идём дальше
        }

        // ── Шаг 2: если не нашли — пробуем привязать через start_param ────
        if (!user) {
          const athleteId = getAthleteIdFromStartParam();
          if (athleteId) {
            try {
              const { data } = await api.post('/auth/telegram/link', {
                telegramId,
                userId: athleteId,
              });
              user = data.data as AuthUser;
            } catch {
              // привязка не удалась — пользователь останется null
            }
          }
        }

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
        }
      } catch {
        if (!cancelled) setAuthStatus('error');
      }
    };

    run();
    return () => { cancelled = true; };
  }, [telegramId]);

  return (
    <AuthContext.Provider value={{ authUser, authStatus, setAuthUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
