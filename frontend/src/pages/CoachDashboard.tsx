import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Dumbbell, Calendar, PlusCircle, CalendarDays,
  TrendingUp, UserPlus, Copy, Check, X, Share2,
} from 'lucide-react';
import api from '../services/api';
import workoutService from '../services/workoutService';
import athleteService from '../services/athleteService';
import './CoachDashboard.css';

interface Athlete {
  id: number;
  first_name: string;
  last_name?: string;
  phone?: string;
}

type ModalStep = 'form' | 'saving' | 'done';

const BOT_LINK = 'https://t.me/kablaev_team_bot';

export const CoachDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [plansCount, setPlansCount] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [loading, setLoading] = useState(true);

  // Модалка создания спортсмена
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('form');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [createdName, setCreatedName] = useState('');
  const [athleteBotLink, setAthleteBotLink] = useState(''); // одноразовая защищённая ссылка
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const coachId = localStorage.getItem('selectedCoachId');
    if (coachId) {
      loadDashboard(parseInt(coachId));
    } else {
      navigate('/select-user');
    }
  }, []);

  const loadDashboard = async (coachId: number) => {
    try {
      const [athletesRes, plansRes] = await Promise.all([
        api.get(`/users/coach/${coachId}/athletes`),
        workoutService.getCoachPlans(coachId),
      ]);
      const allAthletes: Athlete[] = athletesRes.data.data || [];
      setAthletes(allAthletes);
      setPlansCount(plansRes.data.length);

      let total = 0;
      for (const a of allAthletes) {
        try {
          const s = await athleteService.getAthleteSummary(a.id);
          total += parseInt(s.data.summary.total_workouts) || 0;
        } catch { }
      }
      setTotalWorkouts(total);
    } catch (error) {
      console.error('Ошибка загрузки дашборда:', error);
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  // Создание спортсмена
  // ──────────────────────────────────────────────
  const openModal = () => {
    setFirstName('');
    setLastName('');
    setFormError('');
    setModalStep('form');
    setCopied(false);
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleCreate = async () => {
    const trimmed = firstName.trim();
    if (!trimmed) {
      setFormError('Введите имя спортсмена');
      return;
    }
    const coachId = localStorage.getItem('selectedCoachId');
    if (!coachId) return;

    setFormError('');
    setModalStep('saving');

    try {
      const { data } = await api.post('/athletes', {
        first_name: trimmed,
        last_name: lastName.trim() || undefined,
        coach_id: parseInt(coachId),
      });

      const botLink: string = data.data.botLink || BOT_LINK;
      setAthleteBotLink(botLink);

      const fullName = [trimmed, lastName.trim()].filter(Boolean).join(' ');
      setCreatedName(fullName);
      setModalStep('done');

      // Обновляем список спортсменов
      loadDashboard(parseInt(coachId));

      // Автоматически открываем системный диалог «Поделиться»
      const shareText = `Привет! Тренер добавил тебя в фитнес-приложение. Открой бота в Telegram и нажми Старт:`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Приглашение в команду',
            text: shareText,
            url: botLink,
          });
        } catch { /* отменили — ничего страшного */ }
      }
    } catch (error) {
      console.error('Ошибка создания спортсмена:', error);
      setModalStep('form');
      setFormError('Не удалось создать спортсмена. Попробуйте ещё раз.');
    }
  };

  const handleShare = async () => {
    const link = athleteBotLink || BOT_LINK;
    const text = `Привет! Тренер добавил тебя в фитнес-приложение. Открой бота в Telegram и нажми Старт:`;

    // 1. Web Share API (iOS/Android — открывает WhatsApp, Telegram и др.)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Приглашение в команду', text, url: link });
        return;
      } catch { /* пользователь отменил */ }
    }

    // 2. Telegram openTelegramLink (если закрыли диалог, но мы в Mini App)
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
      );
      return;
    }

    // 3. Fallback — копируем в буфер
    handleCopy();
  };

  const handleCopy = async () => {
    const link = athleteBotLink || BOT_LINK;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { }
  };

  return (
    <div className="coach-dashboard">
      <div className="dashboard-header">
        <h1>Панель тренера</h1>
        <p>Управляйте тренировками и спортсменами</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Users size={24} />
          <div className="stat-info">
            <span className="stat-value">{athletes.length}</span>
            <span className="stat-label">Спортсменов</span>
          </div>
        </div>
        <div className="stat-card">
          <Dumbbell size={24} />
          <div className="stat-info">
            <span className="stat-value">{plansCount}</span>
            <span className="stat-label">Планов</span>
          </div>
        </div>
        <div className="stat-card">
          <Calendar size={24} />
          <div className="stat-info">
            <span className="stat-value">{totalWorkouts}</span>
            <span className="stat-label">Тренировок</span>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="action-button primary" onClick={() => navigate('/coach/exercises')}>
          <Dumbbell size={20} />
          Библиотека упражнений
        </button>
        <button className="action-button secondary" onClick={() => navigate('/coach/create-plan')}>
          <PlusCircle size={20} />
          Создать план
        </button>
        <button className="action-button invite" onClick={openModal}>
          <UserPlus size={20} />
          Добавить спортсмена
        </button>
      </div>

      <div className="section">
        <h2>Мои спортсмены</h2>
        {loading ? (
          <p className="loading-text">Загрузка...</p>
        ) : athletes.length > 0 ? (
          <div className="athletes-list">
            {athletes.map((athlete) => (
              <div key={athlete.id} className="athlete-card">
                <div className="athlete-avatar">
                  {athlete.first_name[0]}{athlete.last_name?.[0]}
                </div>
                <div className="athlete-info">
                  <h3>{athlete.first_name} {athlete.last_name}</h3>
                  <p>{athlete.phone || 'Нет телефона'}</p>
                </div>
                <div className="athlete-actions">
                  <button
                    className="athlete-action-btn plans"
                    onClick={() => navigate(`/coach/athlete/${athlete.id}/plans`)}
                    title="Планы"
                  >
                    <Dumbbell size={18} />
                  </button>
                  <button
                    className="athlete-action-btn calendar"
                    onClick={() => navigate(`/coach/athlete/${athlete.id}/calendar`)}
                    title="Календарь"
                  >
                    <CalendarDays size={18} />
                  </button>
                  <button
                    className="athlete-action-btn progress"
                    onClick={() => navigate(`/coach/athlete/${athlete.id}/progress`)}
                    title="Прогресс"
                  >
                    <TrendingUp size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Users size={40} />
            <p>Спортсменов пока нет</p>
            <button className="empty-invite-btn" onClick={openModal}>
              Добавить первого
            </button>
          </div>
        )}
      </div>

      {/* ── Модалка создания спортсмена ── */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="add-athlete-modal" onClick={(e) => e.stopPropagation()}>

            {/* Заголовок */}
            <div className="modal-header">
              <h3>
                {modalStep === 'done' ? 'Спортсмен добавлен' : 'Новый спортсмен'}
              </h3>
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            {/* ── Форма ── */}
            {modalStep === 'form' && (
              <div className="modal-body">
                <p className="modal-hint">
                  Введите имя и фамилию спортсмена. После этого вы сможете отправить ему ссылку на бота.
                </p>
                <div className="form-group">
                  <label className="form-label">Имя *</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Например: Алексей"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setFormError(''); }}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Фамилия</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Например: Иванов"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                </div>
                {formError && <p className="form-error">{formError}</p>}
                <button className="modal-submit-btn" onClick={handleCreate}>
                  Готово
                </button>
              </div>
            )}

            {/* ── Сохранение ── */}
            {modalStep === 'saving' && (
              <div className="modal-body modal-saving">
                <div className="modal-spinner" />
                <p>Создаём профиль…</p>
              </div>
            )}

            {/* ── Успех + шара ── */}
            {modalStep === 'done' && (
              <div className="modal-body">
                <div className="done-athlete-name">{createdName}</div>
                <p className="modal-hint">
                  Теперь отправьте спортсмену ссылку на бота. Он нажмёт <strong>Старт</strong> — и приложение откроется.
                </p>

                {/* Числовой ID не является секретом и не используется для входа. */}
                <div className="invite-code-block">
                  <p className="invite-code-label">Одноразовая ссылка-приглашение готова</p>
                  <div className="invite-code-value">Отправьте её спортсмену</div>
                </div>

                <div className="done-actions">
                  <button className="share-btn" onClick={handleShare}>
                    <Share2 size={18} />
                    Отправить
                  </button>
                  <button className="copy-btn" onClick={handleCopy}>
                    {copied
                      ? <><Check size={16} /> Скопировано</>
                      : <><Copy size={16} /> Копировать</>}
                  </button>
                </div>
                <button className="modal-add-more-btn" onClick={openModal}>
                  + Добавить ещё одного
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
