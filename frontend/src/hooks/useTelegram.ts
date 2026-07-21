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
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [telegramId, setTelegramId] = useState<string | null>(null);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;

    if (tg) {
      // Вызываем ready() — это обязательно до чтения initDataUnsafe
      tg.ready();
      tg.expand();

      // Даём Telegram время заполнить initDataUnsafe (обычно <100ms)
      const timer = setTimeout(() => {
        const u: TelegramUser | null = tg.initDataUnsafe?.user ?? null;
        setUser(u);
        setTelegramId(u?.id ? String(u.id) : null);
        setIsReady(true);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      // Запущено вне Telegram (браузер/devtools) — сразу готово
      setTimeout(() => setIsReady(true), 100);
    }
  }, []);

  return { isReady, user, telegramId };
}
