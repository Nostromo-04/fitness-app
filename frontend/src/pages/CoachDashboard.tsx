import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Dumbbell, Calendar, PlusCircle, CalendarDays, TrendingUp, UserPlus, Copy, Check } from 'lucide-react';
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

export const CoachDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [plansCount, setPlansCount] = useState(0);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const coachId = localStorage.getItem('selectedCoachId');
    if (coachId) {
      loadCoachInfo(parseInt(coachId));
      fetchAthletes(parseInt(coachId));
      fetchPlansCount(parseInt(coachId));
      fetchTotalWorkouts(parseInt(coachId));
    } else {
      navigate('/select-user');
    }
  }, []);

  const loadCoachInfo = async (coachId: number) => {
    try {
      await api.get(`/users/${coachId}`);
    } catch (error) {
      console.error('Ошибка загрузки информации о тренере:', error);
    }
  };

  const fetchAthletes = async (coachId: number) => {
    try {
      const response = await api.get(`/users/coach/${coachId}/athletes`);
      setAthletes(response.data.data);
    } catch (error) {
      console.error('Ошибка загрузки спортсменов:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlansCount = async (coachId: number) => {
    try {
      const response = await workoutService.getCoachPlans(coachId);
      setPlansCount(response.data.length);
    } catch (error) {
      console.error('Ошибка загрузки количества планов:', error);
    }
  };

  const fetchTotalWorkouts = async (coachId: number) => {
    try {
      const athletesResponse = await api.get(`/users/coach/${coachId}/athletes`);
      const allAthletes = athletesResponse.data.data || [];
      let total = 0;
      for (const athlete of allAthletes) {
        try {
          const summaryResponse = await athleteService.getAthleteSummary(athlete.id);
          const count = parseInt(summaryResponse.data.summary.total_workouts) || 0;
          total += count;
        } catch { }
      }
      setTotalWorkouts(total);
    } catch (error) {
      console.error('Ошибка загрузки тренировок:', error);
    }
  };

  const handleInvite = async () => {
    const coachId = localStorage.getItem('selectedCoachId');
    if (!coachId) return;
    setInviteLoading(true);
    setShowInviteModal(true);
    try {
      const { data } = await api.post(`/invites/coach/${coachId}`);
      setInviteLink(data.data.inviteLink);
    } catch {
      setInviteLink('');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { }
  };

  const handleShare = async () => {
    if (!inviteLink) return;
    const text = 'Присоединяйтесь к моей команде в фитнес-приложении!';

    // 1. Web Share API — открывает системный диалог «Поделиться» (работает в Telegram на iOS/Android)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Приглашение в команду', text, url: inviteLink });
        return;
      } catch { /* пользователь отменил — не падаем */ }
    }

    // 2. Telegram openTelegramLink — открывает диалог пересылки внутри Telegram
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`
      );
      return;
    }

    // 3. Fallback — просто копируем
    handleCopy();
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
            <span className="stat-label">Всего Спортсменов</span>
          </div>
        </div>
        <div className="stat-card">
          <Dumbbell size={24} />
          <div className="stat-info">
            <span className="stat-value">{plansCount}</span>
            <span className="stat-label">Всего Планов</span>
          </div>
        </div>
        <div className="stat-card">
          <Calendar size={24} />
          <div className="stat-info">
            <span className="stat-value">{totalWorkouts}</span>
            <span className="stat-label">Всего Тренировок</span>
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
        <button className="action-button invite" onClick={handleInvite}>
          <UserPlus size={20} />
          Пригласить спортсмена
        </button>
      </div>

      <div className="section">
        <h2>Мои спортсмены</h2>
        {loading ? (
          <p>Загрузка...</p>
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
                    title="Планы спортсмена"
                  >
                    <Dumbbell size={18} />
                  </button>
                  <button
                    className="athlete-action-btn calendar"
                    onClick={() => navigate(`/coach/athlete/${athlete.id}/calendar`)}
                    title="Календарь тренировок"
                  >
                    <CalendarDays size={18} />
                  </button>
                  <button
                    className="athlete-action-btn progress"
                    onClick={() => navigate(`/coach/athlete/${athlete.id}/progress`)}
                    title="Прогресс спортсмена"
                  >
                    <TrendingUp size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            У вас пока нет спортсменов.
            <br />
            <button className="empty-invite-btn" onClick={handleInvite}>
              Пригласить первого
            </button>
          </p>
        )}
      </div>

      {/* Модалка с инвайт-ссылкой */}
      {showInviteModal && (
        <div className="invite-modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Пригласить спортсмена</h3>
            {inviteLoading ? (
              <div className="invite-modal-loading">
                <div className="invite-modal-spinner" />
                <p>Генерируем ссылку…</p>
              </div>
            ) : inviteLink ? (
              <>
                <p className="invite-modal-hint">
                  Отправьте ссылку спортсмену. После перехода он введёт имя и сразу окажется в вашей команде. Ссылка действует 72 часа.
                </p>
                <div className="invite-link-box">
                  <span className="invite-link-text">{inviteLink}</span>
                </div>
                <div className="invite-modal-actions">
                  <button className="invite-share-btn" onClick={handleShare}>
                    Отправить в Telegram
                  </button>
                  <button className="invite-copy-btn" onClick={handleCopy}>
                    {copied ? <><Check size={16} /> Скопировано</> : <><Copy size={16} /> Копировать</>}
                  </button>
                </div>
              </>
            ) : (
              <p className="invite-modal-error">Не удалось создать ссылку. Попробуйте ещё раз.</p>
            )}
            <button className="invite-modal-close" onClick={() => setShowInviteModal(false)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
