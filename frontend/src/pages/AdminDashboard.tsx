import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Dumbbell, UserPlus, Share2, Copy, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './AdminDashboard.css';

type ModalStep = 'form' | 'saving' | 'done';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { authUser } = useAuth();

  const [showModal, setShowModal]         = useState(false);
  const [modalStep, setModalStep]         = useState<ModalStep>('form');
  const [firstName, setFirstName]         = useState('');
  const [lastName, setLastName]           = useState('');
  const [formError, setFormError]         = useState('');
  const [createdName, setCreatedName]     = useState('');
  const [coachBotLink, setCoachBotLink]   = useState('');
  const [copied, setCopied]               = useState(false);

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
      setFormError('Введите имя тренера');
      return;
    }
    setFormError('');
    setModalStep('saving');

    try {
      const { data } = await api.post('/coaches', {
        first_name: trimmed,
        last_name: lastName.trim() || undefined,
      });

      const botLink = data.data.botLink;
      setCoachBotLink(botLink);
      setCreatedName([trimmed, lastName.trim()].filter(Boolean).join(' '));
      setModalStep('done');

      const shareText = `Привет! Вы добавлены как тренер в фитнес-приложение. Откройте бота и введите ваш код:`;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Приглашение тренера', text: shareText, url: botLink });
        } catch { }
      }
    } catch (error) {
      console.error('Ошибка создания тренера:', error);
      setModalStep('form');
      setFormError('Не удалось создать тренера. Попробуйте ещё раз.');
    }
  };

  const handleShare = async () => {
    const link = coachBotLink;
    const text = `Привет! Вы добавлены как тренер в фитнес-приложение. Откройте бота и введите ваш код:`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Приглашение тренера', text, url: link });
        return;
      } catch { }
    }

    const tg = (window as any).Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
      );
      return;
    }

    handleCopy();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(coachBotLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-badge">
          <Shield size={20} />
          Администратор
        </div>
        <h1>Добро пожаловать,<br />{authUser?.first_name}!</h1>
        <p>Выберите раздел для управления</p>
      </div>

      <div className="admin-cards">
        <button className="admin-card" onClick={() => navigate('/select-user')}>
          <div className="admin-card-icon"><Users size={28} /></div>
          <div className="admin-card-info">
            <h3>Управление пользователями</h3>
            <p>Тренеры, спортсмены, роли</p>
          </div>
          <span className="admin-card-arrow">›</span>
        </button>

        <button className="admin-card" onClick={() => navigate('/coach/exercises')}>
          <div className="admin-card-icon"><Dumbbell size={28} /></div>
          <div className="admin-card-info">
            <h3>Библиотека упражнений</h3>
            <p>Добавить и редактировать упражнения</p>
          </div>
          <span className="admin-card-arrow">›</span>
        </button>
      </div>

      <button className="admin-add-coach-btn" onClick={openModal}>
        <UserPlus size={20} />
        Пригласить тренера
      </button>

      <button className="admin-start-btn" onClick={() => navigate('/select-user')}>
        Начать
      </button>

      {/* Модалка добавления тренера */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <h3>{modalStep === 'done' ? 'Тренер добавлен' : 'Новый тренер'}</h3>
              <button className="modal-close-btn" onClick={closeModal}><X size={20} /></button>
            </div>

            {modalStep === 'form' && (
              <div className="modal-body">
                <p className="modal-hint">
                  Введите имя и фамилию. После добавления отправьте тренеру одноразовую ссылку-приглашение.
                </p>
                <div className="form-group">
                  <label className="form-label">Имя *</label>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Например: Андрей"
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
                    placeholder="Например: Каблаев"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                </div>
                {formError && <p className="form-error">{formError}</p>}
                <button className="modal-submit-btn" onClick={handleCreate}>Готово</button>
              </div>
            )}

            {modalStep === 'saving' && (
              <div className="modal-body modal-saving">
                <div className="modal-spinner" />
                <p>Создаём профиль…</p>
              </div>
            )}

            {modalStep === 'done' && (
              <div className="modal-body">
                <div className="done-name">{createdName}</div>
                <p className="modal-hint">
                  Отправьте тренеру ссылку на бота. В Telegram он нажмёт <strong>Старт</strong>,
                  затем откроет приложение.
                </p>

                <div className="invite-code-block">
                  <p className="invite-code-label">Одноразовая ссылка-приглашение готова</p>
                  <div className="invite-code-value">Отправьте её тренеру</div>
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
