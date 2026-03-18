import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import type { Exercise } from '../services/exerciseService';
import exerciseService from '../services/exerciseService';
import './ExerciseSelector.css';

interface ExerciseSelectorProps {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
  selectedExerciseIds?: number[];
}

export const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  onSelect,
  onClose,
  selectedExerciseIds = []
}) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExercises();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [exercises, selectedGroup, searchQuery]);

  const loadExercises = async () => {
    try {
      const [exercisesRes, groupsRes] = await Promise.all([
        exerciseService.getAll(),
        exerciseService.getMuscleGroups()
      ]);
      setExercises(exercisesRes.data.exercises);
      setMuscleGroups(groupsRes.data);
    } catch (error) {
      console.error('Ошибка загрузки упражнений:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = () => {
    let filtered = exercises.filter(ex => !selectedExerciseIds.includes(ex.id));
    
    if (selectedGroup) {
      filtered = filtered.filter(ex => ex.muscle_group === selectedGroup);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(ex => 
        ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredExercises(filtered);
  };

  return (
    <div className="selector-overlay" onClick={onClose}>
      <div className="selector-content" onClick={e => e.stopPropagation()}>
        <div className="selector-header">
          <h2>Выберите упражнение</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="selector-filters">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Поиск упражнений..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select 
            value={selectedGroup} 
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="group-select"
          >
            <option value="">Все группы</option>
            {muscleGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>

        <div className="selector-list">
          {loading ? (
            <p className="loading">Загрузка...</p>
          ) : filteredExercises.length > 0 ? (
            filteredExercises.map(exercise => (
              <div 
                key={exercise.id} 
                className="exercise-item"
                onClick={() => onSelect(exercise)}
              >
                <div className="exercise-info">
                  <span className="exercise-name">{exercise.name}</span>
                  <span className="exercise-group">{exercise.muscle_group}</span>
                </div>
                {(exercise.image_url || exercise.video_url) && (
                  <div className="exercise-media-icons">
                    {exercise.image_url && <span className="media-icon">📷</span>}
                    {exercise.video_url && <span className="media-icon">🎥</span>}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="empty-state">
              {searchQuery || selectedGroup 
                ? 'Ничего не найдено' 
                : 'Нет доступных упражнений'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};