import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Filter, ArrowLeft } from 'lucide-react';
import exerciseService from '../services/exerciseService';
import type { Exercise } from '../services/exerciseService';
import { ExerciseCard } from '../components/ExerciseCard';
import { ExerciseModal } from '../components/ExerciseModal';
import './ExerciseLibrary.css';

export const ExerciseLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [exercises, selectedGroup, searchQuery]);

  const loadData = async () => {
    try {
      const [exercisesRes, groupsRes] = await Promise.all([
        exerciseService.getAll(),
        exerciseService.getMuscleGroups()
      ]);
      setExercises(exercisesRes.data.exercises);
      setMuscleGroups(groupsRes.data);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterExercises = () => {
    let filtered = [...exercises];
    
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

  const handleCreateExercise = async (exerciseData: any) => {
    try {
      await exerciseService.create({
        ...exerciseData,
        created_by_coach_id: 1 // Временно используем ID тренера = 1
      });
      await loadData();
      setModalOpen(false);
    } catch (error) {
      console.error('Ошибка создания:', error);
    }
  };

  const handleUpdateExercise = async (exerciseData: any) => {
    if (!editingExercise) return;
    try {
      await exerciseService.update(editingExercise.id, exerciseData);
      await loadData();
      setModalOpen(false);
      setEditingExercise(null);
    } catch (error) {
      console.error('Ошибка обновления:', error);
    }
  };

  const handleDeleteExercise = async (id: number) => {
    if (window.confirm('Удалить это упражнение?')) {
      try {
        await exerciseService.delete(id);
        await loadData();
      } catch (error) {
        console.error('Ошибка удаления:', error);
      }
    }
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingExercise(null);
  };

  return (
    <div className="exercise-library">
      <div className="library-header">
        <button className="back-btn" onClick={() => navigate('/coach/dashboard')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Библиотека упражнений</h1>
        <button className="add-btn" onClick={() => setModalOpen(true)}>
          <Plus size={20} />
        </button>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Поиск упражнений..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="group-filter">
          <Filter size={20} />
          <select 
            value={selectedGroup} 
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="">Все группы</option>
            {muscleGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="loading">Загрузка...</p>
      ) : (
        <div className="exercises-list">
          {filteredExercises.length > 0 ? (
            filteredExercises.map(exercise => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onEdit={handleEdit}
                onDelete={handleDeleteExercise}
              />
            ))
          ) : (
            <p className="empty-state">
              {searchQuery || selectedGroup 
                ? 'Ничего не найдено' 
                : 'Упражнений пока нет. Создайте первое!'}
            </p>
          )}
        </div>
      )}

      <ExerciseModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={editingExercise ? handleUpdateExercise : handleCreateExercise}
        exercise={editingExercise}
        muscleGroups={muscleGroups}
      />
    </div>
  );
};