import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
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
      
      {(exercise.image_url || exercise.video_url) && (
        <div className="exercise-preview">
          <img
            src={exercise.image_url || exercise.video_url}
            alt={exercise.name}
            loading="lazy"
          />
        </div>
      )}

      {exercise.instruction && (
        <details className="exercise-instruction">
          <summary>Техника выполнения</summary>
          <p>{exercise.instruction}</p>
        </details>
      )}

      {exercise.created_by_coach_id == null ? (
        <div className="shared-exercise-label">Общее упражнение</div>
      ) : (
        <div className="exercise-actions">
          <button className="edit-btn" onClick={() => onEdit(exercise)}>
            <Edit2 size={18} />
          </button>
          <button className="delete-btn" onClick={() => onDelete(exercise.id)}>
            <Trash2 size={18} />
          </button>
        </div>
      )}
    </div>
  );
};