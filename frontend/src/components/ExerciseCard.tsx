import React from 'react';
import { Edit2, Trash2, Video, Image as ImageIcon } from 'lucide-react';
import type { Exercise } from '../services/exerciseService'; // Используем type-only import
import './ExerciseCard.css';

interface ExerciseCardProps {
  exercise: Exercise;
  onEdit: (exercise: Exercise) => void;
  onDelete: (id: number) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onEdit, onDelete }) => {
  return (
    <div className="exercise-card">
      <div className="exercise-header">
        <h3>{exercise.name}</h3>
        <span className="muscle-badge">{exercise.muscle_group}</span>
      </div>
      
      <div className="exercise-media">
        {exercise.image_url && (
          <div className="media-item">
            <ImageIcon size={16} />
            <span>Фото</span>
          </div>
        )}
        {exercise.video_url && (
          <div className="media-item">
            <Video size={16} />
            <span>Видео</span>
          </div>
        )}
      </div>

      <div className="exercise-actions">
        <button className="edit-btn" onClick={() => onEdit(exercise)}>
          <Edit2 size={18} />
        </button>
        <button className="delete-btn" onClick={() => onDelete(exercise.id)}>
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};