import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, UserPlus, CheckCircle } from 'lucide-react';
import api from '../services/api';
import './AthleteInvitePage.css';

type Step = 'loading' | 'form' | 'success' | 'error';

export function AthleteInvitePage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('loading');
  const [token, setToken] = useState('');
  const [coachName, setCoachName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // 1. Читаем токен из URL (?token=...) — основной способ
    const urlToken = new URLSearchParams(window.location.search).get('token') || '';

    // 2. Fallback: start_param из Telegram WebApp (если открыто через бота)
    const tg = window.Telegram?.WebApp;
    const startParam = tg?.initDataUnsafe?.start_param || '';

    const resolvedToken = urlToken || startParam;

    if (!resolvedToken || !resolvedToken.startsWith('coach_')) {
      setStep('error');
      setErrorMsg('Ссылка недействительна. Попросите тренера отправить новую.');
      return;
    }

    setToken(resolvedToken);

    // Проверяем токен на сервере
    api
      .get(`/invites/check/${resolvedToken}`)
      .then(({ data }) => {
        setCoachName(data.data.coachName);
        setStep('form');
      })
      .catch((err) => {
        const msg = err?.response?.data?.message || 'Ссылка недействительна или устарела.';
        setErrorMsg(msg);
        setStep('error');
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || submitting) return;
    setSubmitting(true);

    const tg = window.Telegram?.WebApp;
    const telegramId = tg?.initDataUnsafe?.user?.id?.toString() || null;

    try {
      const { data } = await api.post('/invites/register', {
        token,
        first_name: firstName.trim(),
        last_name: lastName.trim() || undefined,
        telegram_id: telegramId,
      });

      // Сохраняем как спортсмена и переходим в дашборд
      localStorage.setItem('selectedAthleteId', data.data.id.toString());
      setStep('success');
      setTimeout(() => navigate('/athlete/dashboard', { replace: true }), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Ошибка. Попробуйте ещё раз.';
      setErrorMsg(msg);
      setSubmitting(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="invite-page">
        <div className="invite-loading">
          <div className="invite-spinner" />
          <p>Проверяем ссылку…</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="invite-page">
        <div className="invite-error-card">
          <div className="invite-error-icon">✕</div>
          <h2>Ссылка недействительна</h2>
          <p>{errorMsg}</p>
          <button className="invite-back-btn" onClick={() => navigate('/')}>
            На главную
          </button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="invite-page">
        <div className="invite-success-card">
          <CheckCircle size={56} color="var(--fit-accent, #a3e635)" />
          <h2>Добро пожаловать!</h2>
          <p>Вы добавлены в команду тренера <strong>{coachName}</strong>.</p>
          <div className="invite-success-hint">
            <p>Чтобы открывать приложение в следующий раз — найдите бота в Telegram:</p>
            <a
              className="invite-bot-link"
              href="https://t.me/kablaev_team_bot"
              target="_blank"
              rel="noreferrer"
              onClick={() => window.Telegram?.WebApp?.openTelegramLink?.('https://t.me/kablaev_team_bot')}
            >
              @kablaev_team_bot
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-page">
      <div className="invite-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ChevronLeft size={20} />
        </button>
        <h1>Вступить в команду</h1>
      </div>

      <div className="invite-form-card">
        <div className="invite-icon-wrap">
          <UserPlus size={40} color="var(--fit-accent, #a3e635)" />
        </div>
        <p className="invite-subtitle">
          Тренер <strong>{coachName}</strong> приглашает вас в свою команду.
          <br />
          Введите ваше имя, чтобы начать.
        </p>

        <form onSubmit={handleSubmit} className="invite-form">
          <div className="invite-field">
            <label htmlFor="firstName">Имя *</label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Алексей"
              autoFocus
              required
            />
          </div>
          <div className="invite-field">
            <label htmlFor="lastName">Фамилия</label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Иванов"
            />
          </div>

          {errorMsg && <p className="invite-form-error">{errorMsg}</p>}

          <button
            type="submit"
            className="invite-submit-btn"
            disabled={!firstName.trim() || submitting}
          >
            {submitting ? 'Сохранение…' : 'Вступить в команду'}
          </button>
        </form>
      </div>
    </div>
  );
}
