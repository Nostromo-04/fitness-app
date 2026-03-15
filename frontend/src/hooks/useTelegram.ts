import { useEffect, useState } from 'react';

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const initTelegram = async () => {
      try {
        // Проверяем, запущено ли приложение в Telegram
        if (window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          
          // Сообщаем Telegram, что приложение готово
          tg.ready();
          
          // Растягиваем на весь экран
          tg.expand();
          
          // Получаем данные пользователя
          if (tg.initDataUnsafe?.user) {
            setUser(tg.initDataUnsafe.user);
          }
        }
        setIsReady(true);
      } catch (error) {
        console.error('Telegram initialization error:', error);
        setIsReady(true);
      }
    };

    initTelegram();
  }, []);

  return {
    isReady,
    user,
  };
}

// Добавляем типы для Telegram WebApp
declare global {
  interface Window {
    Telegram: any;
  }
}