import { useEffect, useState } from 'react';
import { resolveTelegramStartParam } from '../utils/inviteToken';

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
  initData: string;
  startParam: string;
}

export function useTelegram(): UseTelegramReturn {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [initData, setInitData] = useState('');
  const [startParam, setStartParam] = useState('');

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;

    if (tg) {
      // Вызываем ready() — это обязательно до чтения initDataUnsafe
      tg.ready();
      tg.expand();

      // Интерфейс приложения рассчитан на вертикальный экран. Telegram Bot API
      // 8.0+ умеет фиксировать текущую ориентацию нативно. Для старых клиентов
      // безопасно пробуем стандартный Screen Orientation API.
      try {
        if (typeof tg.lockOrientation === 'function'
          && (typeof tg.isVersionAtLeast !== 'function' || tg.isVersionAtLeast('8.0'))) {
          tg.lockOrientation();
        } else {
          const lockResult = (window.screen.orientation as any)?.lock?.('portrait-primary');
          lockResult?.catch?.(() => {});
        }
      } catch {
        // На неподдерживаемых устройствах сохраняем стандартное поведение.
      }

      // Даём Telegram время заполнить initDataUnsafe (обычно <100ms)
      const timer = setTimeout(() => {
        const u: TelegramUser | null = tg.initDataUnsafe?.user ?? null;
        const currentInitData = tg.initData || '';
        setUser(u);
        setTelegramId(u?.id ? String(u.id) : null);
        setInitData(currentInitData);
        setStartParam(resolveTelegramStartParam({
          unsafeStartParam: tg.initDataUnsafe?.start_param || '',
          initData: currentInitData,
          locationHref: window.location.href,
        }));
        setIsReady(true);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      // Запущено вне Telegram (браузер/devtools) — сразу готово
      setTimeout(() => setIsReady(true), 100);
    }
  }, []);

  return { isReady, user, telegramId, initData, startParam };
}
