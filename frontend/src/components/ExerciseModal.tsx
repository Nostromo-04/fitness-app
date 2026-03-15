import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Exercise } from '../services/exerciseService'; // Используем type-only import
import './ExerciseModal.css';

interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exerciseData: any) => void;
  exercise?: Exercise | null;
  muscleGroups: string[];
}

export const ExerciseModal: React.FC<ExerciseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  exercise,
  muscleGroups
}) => {
  const [formData, setFormData] = useState({
    name: '',
    muscle_group: '',
    image_url: '',
    video_url: ''
  });

  useEffect(() => {
    if (exercise) {
      setFormData({
        name: exercise.name,
        muscle_group: exercise.muscle_group,
        image_url: exercise.image_url || '',
        video_url: exercise.video_url || ''
      });
    } else {
      setFormData({
        name: '',
        muscle_group: '',
        image_url: '',
        video_url: ''
      });
    }
  }, [exercise]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{exercise ? 'Редактировать' : 'Новое'} упражнение</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название упражнения *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Например: Жим штанги лежа"
              required
            />
          </div>

          <div className="form-group">
            <label>Группа мышц *</label>
            <select
              value={formData.muscle_group}
              onChange={e => setFormData({...formData, muscle_group: e.target.value})}
              required
            >
              <option value="">Выберите группу</option>
              {muscleGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Ссылка на изображение</label>
            <input
              type="url"
              value={formData.image_url}
              onChange={e => setFormData({...formData, image_url: e.target.value})}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="form-group">
            <label>Ссылка на видео</label>
            <input
              type="url"
              value={formData.video_url}
              onChange={e => setFormData({...formData, video_url: e.target.value})}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="save-btn">
              {exercise ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};