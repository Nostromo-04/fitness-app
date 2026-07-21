import { useEffect, useState } from 'react';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface UseTelegramReturn {
  isReady: boolean;
  user: TelegramUser | null;
  telegramId: string | null;
}

export function useTelegram(): UseTelegramReturn {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
    // Даём время SDK инициализироваться
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const tg = (window as any).Telegram?.WebApp;
  const user: TelegramUser | null = tg?.initDataUnsafe?.user ?? null;
  const telegramId = user ? String(user.id) : null;

  return { isReady, user, telegramId };
}
