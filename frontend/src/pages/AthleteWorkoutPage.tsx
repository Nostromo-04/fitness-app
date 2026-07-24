import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCcw, CheckCircle, Circle, Plus, Minus, Volume2, VolumeX, Repeat } from 'lucide-react';
import athleteService from '../services/athleteService';
import exerciseService, { type Exercise as LibraryExercise } from '../services/exerciseService';
import './AthleteWorkoutPage.css';

interface Exercise {
  id: number;
  exercise_id: number;
  exercise_name: string;
  muscle_group: string;
  sets_count: number;
  default_reps: number;
  default_weight: number;
  order_index: number;
  image_url?: string;
  video_url?: string;
}

interface Set {
  set_number: number;
  reps: number | null;
  weight: number | null;
  completed: boolean;
}

// Новый тип для предыдущей тренировки
interface PreviousWorkoutSet {
  set_number: number;
  reps_done: number;
  weight_done: number;
  is_completed: boolean;
}

interface PreviousWorkout {
  id: number;
  workout_date: string;
  plan_name: string;
  day_number: number;
  exercises: {
    exercise_id: number;
    exercise_name: string;
    sets: PreviousWorkoutSet[];
  }[];
}

/* ──────────────────────────────────────────────────────────────
   Лёгкий SVG линейный график (без сторонних библиотек).
   Каждая вершина подписана значением. Дата по оси X не выводится.
   ────────────────────────────────────────────────────────────── */
const ProgressLineChart: React.FC<{
  data: number[];
  color?: string;
  format?: (v: number) => string;
}> = ({ data, color = '#a3e635', format }) => {
  if (!data || data.length === 0) {
    return <div className="progress-chart-empty">Недостаточно данных</div>;
  }

  const fmt = format || ((v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(1)));
  const W = 320;
  const H = 150;
  const padL = 18;
  const padR = 18;
  const padTop = 30;
  const padBottom = 16;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const n = data.length;
  const innerW = W - padL - padR;
  const innerH = H - padTop - padBottom;

  const xFor = (i: number) => (n === 1 ? W / 2 : padL + (innerW * i) / (n - 1));
  const yFor = (v: number) => padTop + innerH * (1 - (v - min) / range);

  const pts = data.map((v, i) => ({ x: xFor(i), y: yFor(v), v }));
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${(H - padBottom).toFixed(1)} L${pts[0].x.toFixed(
    1
  )},${(H - padBottom).toFixed(1)} Z`;
  const gradId = `fitGrad-${color.replace('#', '')}`;

  return (
    <svg
      className="progress-line-chart"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill={color} stroke="#0a0a0c" strokeWidth="1.5" />
          <text
            x={Math.max(14, Math.min(W - 14, p.x))}
            y={p.y - 10}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill={color}
          >
            {fmt(p.v)}
          </text>
        </g>
      ))}
    </svg>
  );
};

export const AthleteWorkoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { planId, dayId } = useParams<{ planId: string; dayId: string }>();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [sets, setSets] = useState<{ [key: number]: Set[] }>({});
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [timerDefault, setTimerDefault] = useState(180);
  const [timerValue, setTimerValue] = useState(180);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSound, setTimerSound] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previousWorkout, setPreviousWorkout] = useState<PreviousWorkout | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  // История показателей по упражнению (последние 10 тренировок, старые -> новые)
  const [weightHistory, setWeightHistory] = useState<number[]>([]);
  const [repsHistory, setRepsHistory] = useState<number[]>([]);
  // Модалка подтверждения выхода из незавершённой тренировки
  const [showExitModal, setShowExitModal] = useState(false);
  // Актуальный флаг "тренировка начата и не завершена" — для перехватчиков выхода
  const isDirtyRef = useRef(false);
  // Замена упражнения (только на текущую тренировку)
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceOptions, setReplaceOptions] = useState<LibraryExercise[]>([]);
  const [replaceLoading, setReplaceLoading] = useState(false);

  const currentExercise = exercises[currentExerciseIndex];
  const currentSets = sets[currentExercise?.id] || [];

  useEffect(() => {
    loadWorkoutData();
    initAudio();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentExercise) {
      loadPreviousWorkout(currentExercise.exercise_id);
    }
  }, [currentExercise]);

  // Держим ref в актуальном состоянии: тренировка начата и ещё не завершена
  useEffect(() => {
    isDirtyRef.current = !loading && !!sessionId && !allExercisesCompleted();
  });

  // Перехват системной/жестовой кнопки "назад" и закрытия вкладки
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);

    const handlePopState = () => {
      if (isDirtyRef.current) {
        // Остаёмся на странице и показываем модалку
        window.history.pushState(null, '', window.location.href);
        setShowExitModal(true);
      } else {
        // Тренировка завершена/не начата — выходим как обычно
        window.history.back();
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const initAudio = () => {
    audioRef.current = new Audio('/sounds/beep.mp3');
  };

  // Загрузка предыдущей тренировки + сбор истории показателей по упражнению
  const loadPreviousWorkout = async (exerciseId: number) => {
    const athleteId = localStorage.getItem('selectedAthleteId');
    if (!athleteId) return;

    setProgressLoading(true);
    setWeightHistory([]);
    setRepsHistory([]);
    try {
      // Один лёгкий запрос: история выполненных сетов по упражнению
      // (бэкенд отдаёт строки сетов, отсортированные по дате тренировки DESC).
      const response = await athleteService.getExerciseProgress(parseInt(athleteId), exerciseId, 100);
      const rows: any[] = response?.data?.progress || [];

      const now = new Date();
      const todayKey = `${now.getFullYear()}-${(now.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

      // Группируем сеты по дате тренировки, сохраняя порядок (даты идут DESC).
      const byDate = new Map<string, any[]>();
      const datesDesc: string[] = [];
      for (const row of rows) {
        const dateKey = (row.workout_date || '').split('T')[0];
        if (!dateKey || dateKey === todayKey) continue; // исключаем сегодняшний (активный) день
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, []);
          datesDesc.push(dateKey);
        }
        byDate.get(dateKey)!.push(row);
      }

      // До 10 последних тренировок; за каждый день берём максимумы.
      const recentDatesDesc = datesDesc.slice(0, 10);
      const historyDesc = recentDatesDesc.map((dateKey) => {
        const sets = byDate.get(dateKey)!;
        const maxWeight = Math.max(...sets.map((s) => Number(s.weight_done) || 0));
        const maxReps = Math.max(...sets.map((s) => Number(s.reps_done) || 0));
        return { maxWeight, maxReps };
      });

      // Хронологический порядок (старые -> новые) для графика.
      const historyAsc = [...historyDesc].reverse();
      setWeightHistory(historyAsc.map((h) => h.maxWeight));
      setRepsHistory(historyAsc.map((h) => h.maxReps));

      // Блок "Предыдущая тренировка" — самая свежая дата.
      if (recentDatesDesc.length > 0) {
        const lastDate = recentDatesDesc[0];
        // Сеты приходят DESC по времени создания — разворачиваем для естественного порядка.
        const lastSets = [...byDate.get(lastDate)!].reverse();
        setPreviousWorkout({
          id: 0,
          workout_date: lastDate,
          plan_name: lastSets[0]?.plan_name || '',
          day_number: lastSets[0]?.day_number || 0,
          exercises: [
            {
              exercise_id: exerciseId,
              exercise_name: '',
              sets: lastSets.map((s, i) => ({
                set_number: i + 1,
                reps_done: Number(s.reps_done) || 0,
                weight_done: Number(s.weight_done) || 0,
                is_completed: true,
              })),
            },
          ],
        });
      } else {
        setPreviousWorkout(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки предыдущей тренировки:', error);
    } finally {
      setProgressLoading(false);
    }
  };

  const loadWorkoutData = async () => {
    try {
      const response = await athleteService.getPlanDetails(Number(planId));
      const day = response.data.days.find((d: any) => d.id === Number(dayId));

      if (day) {
        setExercises(day.exercises || []);

        const initialSets: { [key: number]: Set[] } = {};
        day.exercises.forEach((ex: Exercise) => {
          initialSets[ex.id] = Array.from({ length: ex.sets_count }, (_, i) => ({
            set_number: i + 1,
            reps: ex.default_reps,
            weight: ex.default_weight === 0 ? null : ex.default_weight,
            completed: false,
          }));
        });
        setSets(initialSets);

        const athleteId = localStorage.getItem('selectedAthleteId');
        if (!athleteId) {
          console.error('Не выбран спортсмен');
          return;
        }

        const sessionResponse = await athleteService.startWorkout(
          parseInt(athleteId),
          Number(planId),
          Number(dayId)
        );
        setSessionId(sessionResponse.data.id);
      }
    } catch (error) {
      console.error('Ошибка загрузки тренировки:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetComplete = async (exerciseId: number, setNumber: number, completed: boolean) => {
    if (!sessionId) return;

    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;

    setSets((prevSets) => {
      const updatedSets = { ...prevSets };
      const setIndex = updatedSets[exerciseId]?.findIndex((s) => s.set_number === setNumber);

      if (setIndex !== -1 && setIndex !== undefined) {
        const targetSet = updatedSets[exerciseId][setIndex];
        if (targetSet.reps === null || targetSet.reps < 1) {
          return prevSets;
        }

        targetSet.completed = completed;

        // Сохраняем на сервер
        athleteService
          .logSet(sessionId, {
            exercise_id: exercise.exercise_id,
            set_number: setNumber,
            reps_done: targetSet.reps,
            weight_done: targetSet.weight,
            is_completed: completed,
          })
          .catch((error) => {
            console.error('Ошибка сохранения подхода:', error);
            // Откат при ошибке
            targetSet.completed = !completed;
          });
      }
      return updatedSets;
    });
  };

  const handleSetChange = (
    exerciseId: number,
    setNumber: number,
    field: 'reps' | 'weight',
    value: number | null
  ) => {
    setSets((prevSets) => {
      const updatedSets = { ...prevSets };
      const setIndex = updatedSets[exerciseId]?.findIndex((s) => s.set_number === setNumber);

      if (setIndex !== -1 && setIndex !== undefined) {
        updatedSets[exerciseId][setIndex][field] = value;

        if (field === 'weight' && setIndex < updatedSets[exerciseId].length - 1) {
          for (let i = setIndex + 1; i < updatedSets[exerciseId].length; i++) {
            updatedSets[exerciseId][i][field] = value;
          }
        }
      }
      return updatedSets;
    });
  };

  const handleAddSet = async (exerciseId: number) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;

    setSets((prevSets) => {
      const currentExerciseSets = prevSets[exerciseId] || [];
      if (currentExerciseSets.length >= 10) {
        alert('Максимальное количество подходов - 10');
        return prevSets;
      }

      const lastSet = currentExerciseSets[currentExerciseSets.length - 1];
      const newSetNumber = currentExerciseSets.length + 1;
      const newSet: Set = {
        set_number: newSetNumber,
        reps: lastSet ? lastSet.reps : exercise.default_reps,
        weight: lastSet
          ? lastSet.weight !== null
            ? lastSet.weight
            : null
          : exercise.default_weight === 0
          ? null
          : exercise.default_weight,
        completed: false,
      };

      return {
        ...prevSets,
        [exerciseId]: [...currentExerciseSets, newSet],
      };
    });
  };

  const handleRemoveSet = (exerciseId: number) => {
    setSets((prevSets) => {
      const currentExerciseSets = prevSets[exerciseId] || [];
      const lastSet = currentExerciseSets[currentExerciseSets.length - 1];

      if (currentExerciseSets.length <= 1 || !lastSet || lastSet.completed) {
        return prevSets;
      }

      return {
        ...prevSets,
        [exerciseId]: currentExerciseSets.slice(0, -1),
      };
    });
  };

  const isExerciseCompleted = (exerciseId: number) => {
    const exerciseSets = sets[exerciseId] || [];
    return exerciseSets.length > 0 && exerciseSets.every((s) => s.completed);
  };

  const allExercisesCompleted = () => {
    return exercises.length > 0 && exercises.every((ex) => isExerciseCompleted(ex.id));
  };

  const startTimer = () => {
    setTimerActive(true);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimerValue((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          if (timerRef.current) clearInterval(timerRef.current);

          if (timerSound && audioRef.current) {
            audioRef.current.play().catch((e) => console.log('Ошибка воспроизведения звука:', e));
          }

          setTimerValue(timerDefault);
          return timerDefault;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resetTimer = () => {
    setTimerValue(timerDefault);
    setTimerActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleTimerIncrease = () => {
    const newValue = Math.min(timerValue + 60, 600);
    setTimerValue(newValue);
    setTimerDefault(newValue);
  };

  const handleTimerDecrease = () => {
    const newValue = Math.max(timerValue - 60, 60);
    setTimerValue(newValue);
    setTimerDefault(newValue);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCompleteWorkout = async () => {
    if (!sessionId) return;

    navigate('/athlete/complete', {
      state: {
        sessionId,
        planName: exercises[0]?.exercise_name,
      },
    });
  };

  // Клик по кнопке "назад" в шапке
  const handleBackClick = () => {
    if (isDirtyRef.current) {
      setShowExitModal(true);
    } else {
      navigate(-1);
    }
  };

  // "Да" в модалке — завершить и оценить (запись с эмодзи)
  const handleConfirmExit = () => {
    setShowExitModal(false);
    handleCompleteWorkout();
  };

  // "Нет" в модалке — остаться на экране подходов
  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  // Есть ли уже выполненные подходы по упражнению (тогда замена запрещена)
  const hasCompletedSets = (exerciseId: number) => {
    const exerciseSets = sets[exerciseId] || [];
    return exerciseSets.some((s) => s.completed);
  };

  // Открыть модалку замены: подгружаем упражнения той же группы мышц
  const handleReplaceClick = async () => {
    if (!currentExercise) return;
    if (hasCompletedSets(currentExercise.id)) return; // подстраховка: кнопка и так отключена

    setShowReplaceModal(true);
    setReplaceLoading(true);
    setReplaceOptions([]);
    try {
      const response = await exerciseService.getAll(currentExercise.muscle_group);
      const list: LibraryExercise[] = response?.data?.exercises || [];
      // Исключаем упражнения, уже присутствующие в сегодняшнем дне (включая текущее)
      const usedExerciseIds = new Set(exercises.map((ex) => ex.exercise_id));
      setReplaceOptions(list.filter((ex) => !usedExerciseIds.has(ex.id)));
    } catch (error) {
      console.error('Ошибка загрузки упражнений для замены:', error);
    } finally {
      setReplaceLoading(false);
    }
  };

  // Выбор замены: подменяем упражнение в текущей позиции (план тренера не меняется,
  // цель по подходам/повторам/весу сохраняется, новые подходы пишутся под новый exercise_id)
  const handleSelectReplacement = (newExercise: LibraryExercise) => {
    setExercises((prev) =>
      prev.map((ex, idx) =>
        idx === currentExerciseIndex
          ? {
              ...ex,
              exercise_id: newExercise.id,
              exercise_name: newExercise.name,
              muscle_group: newExercise.muscle_group,
              image_url: newExercise.image_url,
              video_url: newExercise.video_url,
            }
          : ex
      )
    );
    setShowReplaceModal(false);
    setReplaceOptions([]);
  };

  const handleCloseReplace = () => {
    setShowReplaceModal(false);
    setReplaceOptions([]);
  };

  // Получаем данные для отображения предыдущей тренировки
  const getPreviousWorkoutData = () => {
    if (!previousWorkout || previousWorkout.exercises.length === 0) return null;
    const exerciseData = previousWorkout.exercises[0];
    if (!exerciseData || exerciseData.sets.length === 0) return null;
    return exerciseData;
  };

  const previousData = getPreviousWorkoutData();

  // Функция для форматирования веса с 2 десятичными знаками
  const formatWeight = (weight: number): string => {
    if (weight === undefined || weight === null) return '0';
    const numWeight = typeof weight === 'string' ? parseFloat(weight) : weight;
    if (isNaN(numWeight)) return '0';
    return numWeight.toFixed(2);
  };

  // Компактный формат веса для подписей графика (без лишних нулей)
  const formatWeightShort = (weight: number): string => {
    const n = Number(weight) || 0;
    return Number.isInteger(n) ? `${n}` : n.toFixed(1);
  };

  if (loading) {
    return <div className="loading">Загрузка тренировки...</div>;
  }

  return (
    <div className="athlete-workout-page">
      <div className="workout-header">
        <button className="back-btn" onClick={handleBackClick}>
          <ArrowLeft size={20} />
        </button>
        <div className="workout-progress">
          <div className="progress-text">
            Упражнение {currentExerciseIndex + 1} из {exercises.length}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentExerciseIndex + 1) / exercises.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {currentExercise && (
        <div className="current-exercise">
          <h2>{currentExercise.exercise_name}</h2>
          <p className="muscle-group">Группа мышц: {currentExercise.muscle_group}</p>

          <button
            className="replace-exercise-btn"
            onClick={handleReplaceClick}
            disabled={hasCompletedSets(currentExercise.id)}
          >
            <Repeat size={16} />
            Заменить упражнение
          </button>
          {hasCompletedSets(currentExercise.id) && (
            <p className="replace-hint">Замена недоступна: уже есть выполненные подходы</p>
          )}

          {/* НОВЫЙ БЛОК: Предыдущая тренировка */}
          <div className="progress-chart-mini">
            <div className="progress-chart-header">
              <span className="progress-chart-title">Предыдущая тренировка</span>
              {progressLoading && <span className="progress-chart-loading">Загрузка...</span>}
            </div>

            {previousData ? (
              <div className="previous-sets-column">
                {previousData.sets.map((set, idx) => (
                  <div key={idx} className="previous-set-item-center">
                    {set.reps_done} × {formatWeight(set.weight_done)} кг
                  </div>
                ))}
              </div>
            ) : (
              <div className="progress-chart-empty">
                {progressLoading ? 'Поиск предыдущей тренировки...' : 'Нет предыдущих тренировок'}
              </div>
            )}
          </div>

          {/* НОВЫЙ БЛОК: Прогресс по весу */}
          <div className="progress-stat-chart">
            <div className="progress-chart-header">
              <span className="progress-chart-title">Прогресс по весу (кг)</span>
              {progressLoading && <span className="progress-chart-loading">Загрузка...</span>}
            </div>
            {weightHistory.length > 0 ? (
              <ProgressLineChart data={weightHistory} color="#a3e635" format={formatWeightShort} />
            ) : (
              <div className="progress-chart-empty">
                {progressLoading ? 'Загрузка...' : 'Недостаточно данных'}
              </div>
            )}
          </div>

          {/* НОВЫЙ БЛОК: Прогресс по повторениям */}
          <div className="progress-stat-chart">
            <div className="progress-chart-header">
              <span className="progress-chart-title">Прогресс по повторениям</span>
              {progressLoading && <span className="progress-chart-loading">Загрузка...</span>}
            </div>
            {repsHistory.length > 0 ? (
              <ProgressLineChart data={repsHistory} color="#a3e635" />
            ) : (
              <div className="progress-chart-empty">
                {progressLoading ? 'Загрузка...' : 'Недостаточно данных'}
              </div>
            )}
          </div>

          {(currentExercise.image_url || currentExercise.video_url) && (
            <div className="exercise-media">
              {currentExercise.image_url && (
                <a href={currentExercise.image_url} target="_blank" rel="noopener noreferrer">
                  📷 Смотреть фото
                </a>
              )}
              {currentExercise.video_url && (
                <a href={currentExercise.video_url} target="_blank" rel="noopener noreferrer">
                  🎥 Смотреть видео
                </a>
              )}
            </div>
          )}
        </div>
      )}

      <div className="workout-sets-list">
        <div className="workout-sets-header">
          <span>Подход</span>
          <span>Повторы</span>
          <span>Вес (кг)</span>
          <span>Готово</span>
        </div>

        {currentSets.map((set) => (
          <div key={set.set_number} className="workout-set-row">
            <span className="set-number">{set.set_number}</span>

            <input
              type="number"
              min="1"
              value={set.reps === null ? '' : set.reps}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                handleSetChange(currentExercise.id, set.set_number, 'reps', value);
              }}
              disabled={set.completed}
              className="set-input"
            />

            <input
              type="number"
              min="0"
              step="2.5"
              value={set.weight === null ? '' : set.weight}
              onChange={(e) => {
                const value = e.target.value === '' ? null : parseFloat(e.target.value);
                handleSetChange(currentExercise.id, set.set_number, 'weight', value);
              }}
              disabled={set.completed}
              className="set-input"
              placeholder="вес"
            />

            <button
              className={`set-checkbox ${set.completed ? 'completed' : ''}`}
              onClick={() => handleSetComplete(currentExercise.id, set.set_number, !set.completed)}
              disabled={set.reps === null || set.reps < 1}
              title={set.reps === null || set.reps < 1 ? 'Введите количество повторов' : 'Готово'}
            >
              {set.completed ? <CheckCircle size={24} /> : <Circle size={24} />}
            </button>
          </div>
        ))}

        <div className="set-count-actions">
          <button
            className="set-count-btn add-set-btn"
            onClick={() => handleAddSet(currentExercise.id)}
            disabled={currentSets.length >= 10}
          >
            <Plus size={20} />
            Добавить подход
          </button>
          <button
            className="set-count-btn remove-set-btn"
            onClick={() => handleRemoveSet(currentExercise.id)}
            disabled={currentSets.length <= 1 || currentSets[currentSets.length - 1]?.completed}
            title={
              currentSets[currentSets.length - 1]?.completed
                ? 'Сначала снимите отметку «Готово» с последнего подхода'
                : 'Убрать последний подход'
            }
          >
            <Minus size={20} />
            Убрать подход
          </button>
        </div>
      </div>

      <div className="timer-section">
        <div className="timer-display">
          <span className="timer-value">{formatTime(timerValue)}</span>
        </div>

        <div className="timer-controls">
          <button
            className={`timer-btn ${timerSound ? 'active' : ''}`}
            onClick={() => setTimerSound(!timerSound)}
            title={timerSound ? 'Звук вкл' : 'Звук выкл'}
          >
            {timerSound ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          <button className="timer-btn play-pause" onClick={startTimer} disabled={timerActive}>
            <Play size={20} />
          </button>

          <button className="timer-btn play-pause" onClick={pauseTimer} disabled={!timerActive}>
            <Pause size={20} />
          </button>

          <button className="timer-btn" onClick={resetTimer}>
            <RotateCcw size={20} />
          </button>

          <button className="timer-btn" onClick={handleTimerIncrease}>
            +1
          </button>

          <button className="timer-btn" onClick={handleTimerDecrease}>
            -1
          </button>
        </div>
      </div>

      <div className="workout-footer">
        <div className="exercise-nav">
          <button
            className="nav-btn"
            disabled={currentExerciseIndex === 0}
            onClick={() => setCurrentExerciseIndex((prev) => prev - 1)}
          >
            Предыдущее
          </button>

          <button
            className="nav-btn"
            disabled={currentExerciseIndex === exercises.length - 1}
            onClick={() => setCurrentExerciseIndex((prev) => prev + 1)}
          >
            Следующее
          </button>
        </div>

        {allExercisesCompleted() && (
          <button className="complete-workout-btn" onClick={handleCompleteWorkout}>
            Завершить тренировку
          </button>
        )}
      </div>

      {showExitModal && (
        <div className="exit-modal-overlay" onClick={handleCancelExit}>
          <div className="exit-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="exit-modal-title">Вы не закончили тренировку</h3>
            <p className="exit-modal-text">
              Хотите завершить и оценить тренировку или продолжить?
            </p>
            <div className="exit-modal-actions">
              <button className="exit-modal-confirm" onClick={handleConfirmExit}>
                Завершить и оценить
              </button>
              <button className="exit-modal-cancel" onClick={handleCancelExit}>
                Продолжить тренировку
              </button>
            </div>
          </div>
        </div>
      )}

      {showReplaceModal && (
        <div className="replace-modal-overlay" onClick={handleCloseReplace}>
          <div className="replace-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="replace-modal-title">Заменить упражнение</h3>
            <p className="replace-modal-subtitle">
              {currentExercise?.muscle_group} · та же группа мышц
            </p>

            {replaceLoading ? (
              <div className="replace-modal-empty">Загрузка...</div>
            ) : replaceOptions.length > 0 ? (
              <div className="replace-options-list">
                {replaceOptions.map((ex) => (
                  <button
                    key={ex.id}
                    className="replace-option"
                    onClick={() => handleSelectReplacement(ex)}
                  >
                    <span className="replace-option-name">{ex.name}</span>
                    <span className="replace-option-group">{ex.muscle_group}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="replace-modal-empty">Нет других упражнений этой группы мышц</div>
            )}

            <button className="replace-modal-cancel" onClick={handleCloseReplace}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
