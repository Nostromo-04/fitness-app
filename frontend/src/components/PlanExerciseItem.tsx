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
  const [setsCount, setSetsCount] = useState(String(exercise.sets_count));
  const [reps, setReps] = useState(String(exercise.default_reps));
  const [weight, setWeight] = useState(
    exercise.default_weight === null || exercise.default_weight === 0
      ? ''
      : String(exercise.default_weight)
  );

  const parsedSets = Number(setsCount);
  const parsedReps = Number(reps);
  const parsedWeight = weight === '' ? 0 : Number(weight);
  const valuesAreValid =
    setsCount !== ''
    && Number.isInteger(parsedSets)
    && parsedSets >= 1
    && parsedSets <= 10
    && reps !== ''
    && Number.isInteger(parsedReps)
    && parsedReps >= 1
    && Number.isFinite(parsedWeight)
    && parsedWeight >= 0;

  const handleSave = () => {
    if (!valuesAreValid) return;

    onUpdate(exercise.id, {
      sets_count: parsedSets,
      default_reps: parsedReps,
      default_weight: parsedWeight
    });
    setIsEditing(false);
  };

  const resetValues = () => {
    setSetsCount(String(exercise.sets_count));
    setReps(String(exercise.default_reps));
    setWeight(
      exercise.default_weight === null || exercise.default_weight === 0
        ? ''
        : String(exercise.default_weight)
    );
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
    if (isEditing) {
      resetValues();
      setIsEditing(false);
      return;
    }
    resetValues();
    setIsEditing(true);
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
                inputMode="numeric"
                onChange={(e) => setSetsCount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Повторы</label>
              <input
                type="number"
                min="1"
                value={reps}
                inputMode="numeric"
                onChange={(e) => setReps(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Вес (кг)</label>
              <input
                type="number"
                min="0"
                step="2.5"
                value={weight}
                inputMode="decimal"
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              className="cancel-btn"
              onClick={() => {
                resetValues();
                setIsEditing(false);
              }}
            >
              Отмена
            </button>
            <button className="save-btn" onClick={handleSave} disabled={!valuesAreValid}>
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
            <span className="detail-value">{exercise.default_weight === 0 ? '-' : `${exercise.default_weight} кг`}</span>
          </div>
        </div>
      )}
    </div>
  );
};
