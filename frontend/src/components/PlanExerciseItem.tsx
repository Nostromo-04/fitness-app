import React, { useState } from 'react';
import { Edit2, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { DayExercise } from '../types/workout';
import './PlanExerciseItem.css';

interface PlanExerciseItemProps {
  exercise: DayExercise;
  onUpdate: (id: number, data: any) => void;
  onDelete: (id: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  showMoveButtons?: boolean;
}

export const PlanExerciseItem: React.FC<PlanExerciseItemProps> = ({
  exercise,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  showMoveButtons = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [setsCount, setSetsCount] = useState(exercise.sets_count);
  const [reps, setReps] = useState(exercise.default_reps);
  const [weight, setWeight] = useState(exercise.default_weight);

  const handleSave = () => {
    console.log('💾 Сохранение упражнения:', exercise.id, {
      sets_count: setsCount,
      default_reps: reps,
      default_weight: weight
    });
    onUpdate(exercise.id, {
      sets_count: setsCount,
      default_reps: reps,
      default_weight: weight
    });
    setIsEditing(false);
  };

  const handleMoveUpClick = () => {
    console.log('⬆️ Нажата стрелка вверх для упражнения:', {
      id: exercise.id,
      name: exercise.exercise_name,
      currentOrder: exercise.order_index
    });
    if (onMoveUp) {
      onMoveUp();
    } else {
      console.log('⚠️ onMoveUp не передан');
    }
  };

  const handleMoveDownClick = () => {
    console.log('⬇️ Нажата стрелка вниз для упражнения:', {
      id: exercise.id,
      name: exercise.exercise_name,
      currentOrder: exercise.order_index
    });
    if (onMoveDown) {
      onMoveDown();
    } else {
      console.log('⚠️ onMoveDown не передан');
    }
  };

  const handleEditClick = () => {
    console.log('✏️ Редактирование упражнения:', exercise.id);
    setIsEditing(!isEditing);
  };

  const handleDeleteClick = () => {
    console.log('🗑️ Удаление упражнения:', exercise.id);
    onDelete(exercise.id);
  };

  return (
    <div className="plan-exercise-item">
      <div className="exercise-header">
        <div className="exercise-title">
          <h4>{exercise.exercise_name}</h4>
          <span className="muscle-badge">{exercise.muscle_group}</span>
        </div>
        <div className="exercise-actions">
          {showMoveButtons && (
            <>
              <button 
                className="icon-btn" 
                onClick={handleMoveUpClick}
                disabled={!onMoveUp}
                title="Переместить вверх"
              >
                <ChevronUp size={18} />
              </button>
              <button 
                className="icon-btn" 
                onClick={handleMoveDownClick}
                disabled={!onMoveDown}
                title="Переместить вниз"
              >
                <ChevronDown size={18} />
              </button>
            </>
          )}
          <button className="icon-btn" onClick={handleEditClick}>
            <Edit2 size={18} />
          </button>
          <button className="icon-btn delete" onClick={handleDeleteClick}>
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="exercise-edit-form">
          <div className="form-row">
            <div className="form-group">
              <label>Подходы</label>
              <input
                type="number"
                min="1"
                max="10"
                value={setsCount}
                onChange={(e) => setSetsCount(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="form-group">
              <label>Повторы</label>
              <input
                type="number"
                min="1"
                value={reps}
                onChange={(e) => setReps(parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="form-group">
              <label>Вес (кг)</label>
              <input
                type="number"
                min="0"
                step="2.5"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="cancel-btn" onClick={() => setIsEditing(false)}>
              Отмена
            </button>
            <button className="save-btn" onClick={handleSave}>
              Сохранить
            </button>
          </div>
        </div>
      ) : (
        <div className="exercise-details">
          <div className="details-row">
            <span className="detail-label">Подходы:</span>
            <span className="detail-value">{exercise.sets_count}</span>
          </div>
          <div className="details-row">
            <span className="detail-label">Повторы:</span>
            <span className="detail-value">{exercise.default_reps}</span>
          </div>
          <div className="details-row">
            <span className="detail-label">Вес:</span>
            <span className="detail-value">{exercise.default_weight} кг</span>
          </div>
        </div>
      )}
    </div>
  );
};