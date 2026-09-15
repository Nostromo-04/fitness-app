import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Award, Calendar, ChevronDown, Image as ImageIcon,
  Share2, Target, TrendingUp, Zap,
} from 'lucide-react';
import athleteService from '../services/athleteService';
import api from '../services/api';
import './AthleteProgressPage.css';

interface Exercise {
  id: number;
  name: string;
  muscle_group: string;
  image_url?: string;
  video_url?: string;
}

interface ProgressPoint {
  reps_done: number;
  weight_done: string;
  workout_date: string;
  plan_name: string;
  day_number: number;
}

interface WorkoutPoint {
  session_id: number;
  workout_date: string;
  plan_name: string;
  day_number: number;
  max_weight: number;
  max_reps: number;
  reps_at_max_weight: number;
  total_volume: number;
}

interface PersonalBest {
  weight_done: number;
  reps_done: number;
  workout_date: string;
}

interface ProgressInsights {
  first: WorkoutPoint | null;
  latest: WorkoutPoint | null;
  weight_gain: number;
  weight_gain_percent: number;
}

interface AthleteSummary {
  summary: {
    total_workouts: string;
    personal_records: number;
    active_week_streak: number;
  };
}

interface AthleteInfo {
  first_name: string;
  last_name: string;
}

type ChartMetric = 'weight' | 'reps' | 'volume';

const formatNumber = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(Number(value) || 0);

const ProgressLine: React.FC<{ workouts: WorkoutPoint[]; metric: ChartMetric }> = ({ workouts, metric }) => {
  if (workouts.length === 0) return <p className="progress-empty">Недостаточно данных</p>;
  const values = workouts.map(item => metric === 'weight' ? Number(item.max_weight) : metric === 'reps' ? Number(item.max_reps) : Number(item.total_volume));
  const width = 420;
  const height = 190;
  const padX = 22;
  const padY = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => ({
    value,
    x: workouts.length === 1 ? width / 2 : padX + index * (width - padX * 2) / (workouts.length - 1),
    y: padY + (height - padY * 2) * (1 - (value - min) / range),
  }));
  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = `${line} L ${points[points.length - 1].x} ${height - 14} L ${points[0].x} ${height - 14} Z`;
  const unit = metric === 'weight' ? 'кг' : metric === 'reps' ? 'раз' : 'кг';

  return (
    <div className="achievement-chart-scroll">
      <svg className="achievement-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Динамика результата">
        <defs>
          <linearGradient id="progressArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a3e635" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#progressArea)" />
        <path d={line} fill="none" stroke="#a3e635" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <g key={workouts[index].session_id}>
            <circle cx={point.x} cy={point.y} r="5" fill="#a3e635" stroke="#18181b" strokeWidth="3" />
            {(index === 0 || index === points.length - 1 || points.length <= 6) && (
              <text x={point.x} y={Math.max(14, point.y - 12)} textAnchor="middle" className="achievement-chart-value">
                {formatNumber(point.value)} {unit}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="achievement-chart-dates">
        <span>{new Date(workouts[0].workout_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
        <span>{new Date(workouts[workouts.length - 1].workout_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
      </div>
    </div>
  );
};

export const AthleteProgressPage: React.FC = () => {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [personalBest, setPersonalBest] = useState<PersonalBest | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutPoint[]>([]);
  const [insights, setInsights] = useState<ProgressInsights>({ first: null, latest: null, weight_gain: 0, weight_gain_percent: 0 });
  const [summary, setSummary] = useState<AthleteSummary | null>(null);
  const [athlete, setAthlete] = useState<AthleteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('weight');
  const [sharing, setSharing] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  const getAthleteId = () => Number(localStorage.getItem('selectedAthleteId'));
  const selectedExercise = exercises.find(exercise => exercise.id === selectedExerciseId) || null;

  useEffect(() => {
    const athleteId = getAthleteId();
    if (!athleteId) {
      navigate('/select-user');
      return;
    }
    Promise.all([
      athleteService.getCompletedWorkoutExercises(athleteId),
      athleteService.getAthleteSummary(athleteId),
      api.get(`/users/${athleteId}`),
    ]).then(([exerciseResponse, summaryResponse, athleteResponse]) => {
      const completedExercises = exerciseResponse.data?.exercises || [];
      setExercises(completedExercises);
      setSelectedExerciseId(completedExercises[0]?.id ?? null);
      setSummary(summaryResponse.data);
      setAthlete(athleteResponse.data.data);
    }).catch(error => console.error('Ошибка загрузки прогресса:', error))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedExerciseId) return;
    setProgressLoading(true);
    setHistoryExpanded(false);
    athleteService.getExerciseProgress(getAthleteId(), selectedExerciseId, 20)
      .then(response => {
        setPersonalBest(response.data.personalBest || null);
        setWorkouts(response.data.workouts || []);
        setInsights(response.data.insights || { first: null, latest: null, weight_gain: 0, weight_gain_percent: 0 });
      })
      .catch(error => console.error('Ошибка загрузки упражнения:', error))
      .finally(() => setProgressLoading(false));
  }, [selectedExerciseId]);

  useEffect(() => {
    if (!selectorOpen) return;
    const close = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) setSelectorOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [selectorOpen]);

  const formatDate = (value?: string) => value ? new Date(value).toLocaleDateString('ru-RU') : '—';
  const resultText = (point: WorkoutPoint | null) => point ? `${formatNumber(point.max_weight)} кг × ${point.reps_at_max_weight} раз` : '—';

  const createShareCard = async () => {
    if (!selectedExercise || !personalBest) return;
    setSharing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const context = canvas.getContext('2d');
      if (!context) return;
      const gradient = context.createLinearGradient(0, 0, 1080, 1080);
      gradient.addColorStop(0, '#11140d');
      gradient.addColorStop(1, '#070807');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 1080, 1080);
      context.fillStyle = '#a3e635';
      context.fillRect(0, 0, 56, 1080);
      context.fillStyle = '#a3e635';
      context.font = '700 38px Arial';
      context.fillText('МОЙ ПРОГРЕСС', 110, 90);
      context.fillStyle = '#ffffff';
      context.font = '700 30px Arial';
      context.fillText([athlete?.first_name, athlete?.last_name].filter(Boolean).join(' ') || 'Спортсмен', 110, 142);
      if (selectedExercise.image_url || selectedExercise.video_url) {
        try {
          const exerciseImage = await loadCanvasImage(new URL(selectedExercise.image_url || selectedExercise.video_url!, window.location.origin).href);
          context.fillStyle = '#ffffff';
          context.beginPath();
          context.roundRect(790, 74, 210, 210, 32);
          context.fill();
          const scale = Math.min(180 / exerciseImage.width, 180 / exerciseImage.height);
          const imageWidth = exerciseImage.width * scale;
          const imageHeight = exerciseImage.height * scale;
          context.drawImage(exerciseImage, 895 - imageWidth / 2, 179 - imageHeight / 2, imageWidth, imageHeight);
        } catch {
          // Экспорт остаётся доступным, даже если внешнее изображение запрещает CORS.
        }
      }
      context.fillStyle = '#ffffff';
      context.font = '700 54px Arial';
      wrapCanvasText(context, selectedExercise.name, 110, 225, 620, 66);
      context.fillStyle = '#a1a1aa';
      context.font = '32px Arial';
      context.fillText(selectedExercise.muscle_group, 110, 365);
      context.fillStyle = '#ffffff';
      context.font = '700 46px Arial';
      context.fillText('Личный рекорд', 110, 475);
      context.fillStyle = '#a3e635';
      context.font = '800 104px Arial';
      context.fillText(`${formatNumber(personalBest.weight_done)} кг`, 110, 605);
      context.fillStyle = '#ffffff';
      context.font = '700 58px Arial';
      context.fillText(`× ${personalBest.reps_done} раз`, 110, 680);
      context.fillStyle = '#a1a1aa';
      context.font = '34px Arial';
      context.fillText(`Первый результат: ${resultText(insights.first)}`, 110, 785);
      context.fillText(`Последний результат: ${resultText(insights.latest)}`, 110, 840);
      context.fillStyle = insights.weight_gain >= 0 ? '#a3e635' : '#f87171';
      context.font = '700 42px Arial';
      context.fillText(`Прогресс: ${insights.weight_gain >= 0 ? '+' : ''}${formatNumber(insights.weight_gain)} кг · ${insights.weight_gain_percent >= 0 ? '+' : ''}${insights.weight_gain_percent}%`, 110, 915);
      context.fillStyle = '#71717a';
      context.font = '30px Arial';
      context.fillText('Kablaev Team · Сильнее с каждой тренировкой', 110, 1010);

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const file = new File([blob], 'fitness-progress.png', { type: 'image/png' });
      const shareData = { title: 'Мой прогресс', text: `${selectedExercise.name}: ${formatNumber(personalBest.weight_done)} кг × ${personalBest.reps_done}`, files: [file] };
      if (navigator.share && navigator.canShare?.(shareData)) await navigator.share(shareData);
      else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') console.error('Ошибка публикации результата:', error);
    } finally {
      setSharing(false);
    }
  };

  const recentWorkouts = [...workouts].reverse();
  const visibleHistory = historyExpanded ? recentWorkouts : recentWorkouts.slice(0, 4);

  return (
    <div className="athlete-progress-page achievement-page">
      <div className="progress-header achievement-header">
        <button className="back-btn" onClick={() => navigate('/athlete/dashboard')}><ArrowLeft size={20} /></button>
        <h1>Мой прогресс</h1>
        <button className="header-share-btn" onClick={createShareCard} disabled={!personalBest || sharing} aria-label="Поделиться результатом">
          <Share2 size={19} />
        </button>
      </div>

      <div className="summary-grid achievement-summary">
        <div className="summary-card"><Calendar size={20} /><div className="summary-info"><span className="summary-value">{summary?.summary.total_workouts || 0}</span><span className="summary-label">Тренировок</span></div></div>
        <div className="summary-card"><Award size={20} /><div className="summary-info"><span className="summary-value">{summary?.summary.personal_records || 0}</span><span className="summary-label">Рекордов</span></div></div>
        <div className="summary-card"><Zap size={20} /><div className="summary-info"><span className="summary-value">{summary?.summary.active_week_streak || 0}</span><span className="summary-label">Недель подряд</span></div></div>
      </div>

      <div className="exercise-selector-section">
        <label>Выберите упражнение</label>
        <div className="exercise-picker" ref={selectorRef}>
          <button type="button" className="exercise-select-button" onClick={() => setSelectorOpen(value => !value)} disabled={loading || !exercises.length} aria-expanded={selectorOpen}>
            {selectedExercise ? <><ExerciseImage exercise={selectedExercise} /><span className="exercise-picker-text"><strong>{selectedExercise.name}</strong><small>{selectedExercise.muscle_group}</small></span></> : <span className="exercise-picker-empty">Нет выполненных упражнений</span>}
            <ChevronDown className={selectorOpen ? 'open' : ''} size={20} />
          </button>
          {selectorOpen && <div className="exercise-picker-menu" role="listbox">{exercises.map(exercise => <button type="button" key={exercise.id} className={`exercise-picker-option ${exercise.id === selectedExerciseId ? 'selected' : ''}`} onClick={() => { setSelectedExerciseId(exercise.id); setSelectorOpen(false); }} role="option" aria-selected={exercise.id === selectedExerciseId}><ExerciseImage exercise={exercise} /><span className="exercise-picker-text"><strong>{exercise.name}</strong><small>{exercise.muscle_group}</small></span></button>)}</div>}
        </div>
      </div>

      {selectedExercise && personalBest && (
        <section className="achievement-hero">
          <div className="achievement-exercise"><ExerciseImage exercise={selectedExercise} /><div><span>Лучший результат</span><h2>{selectedExercise.name}</h2></div></div>
          <div className="achievement-record"><span>Личный рекорд</span><strong>{formatNumber(personalBest.weight_done)} кг <small>× {personalBest.reps_done} раз</small></strong><time>{formatDate(personalBest.workout_date)}</time></div>
          <div className="achievement-comparison">
            <div><span>Первый результат</span><strong>{resultText(insights.first)}</strong></div>
            <div><span>Последний результат</span><strong>{resultText(insights.latest)}</strong></div>
            <div className="achievement-growth"><span>Прогресс</span><strong>{insights.weight_gain >= 0 ? '+' : ''}{formatNumber(insights.weight_gain)} кг <small>· {insights.weight_gain_percent >= 0 ? '+' : ''}{insights.weight_gain_percent}%</small></strong></div>
          </div>
          <button className="share-result-btn" onClick={createShareCard} disabled={sharing}><Share2 size={18} />{sharing ? 'Подготовка…' : 'Поделиться результатом'}</button>
        </section>
      )}

      {selectedExerciseId && (
        <section className="achievement-panel">
          <div className="achievement-section-header"><div><span className="eyebrow">Динамика</span><h3>Рост результата</h3></div><TrendingUp size={22} /></div>
          <div className="metric-tabs">
            <button className={chartMetric === 'weight' ? 'active' : ''} onClick={() => setChartMetric('weight')}>Вес</button>
            <button className={chartMetric === 'reps' ? 'active' : ''} onClick={() => setChartMetric('reps')}>Повторы</button>
            <button className={chartMetric === 'volume' ? 'active' : ''} onClick={() => setChartMetric('volume')}>Объём</button>
          </div>
          {progressLoading ? <div className="progress-empty">Загрузка…</div> : <ProgressLine workouts={workouts} metric={chartMetric} />}
        </section>
      )}

      {visibleHistory.length > 0 && (
        <section className="achievement-panel history-panel">
          <div className="achievement-section-header"><div><span className="eyebrow">История</span><h3>Последние тренировки</h3></div><Target size={22} /></div>
          <div className="workout-history-list">{visibleHistory.map(workout => <div className="workout-history-row" key={workout.session_id}><time>{formatDate(workout.workout_date)}</time><div><strong>{formatNumber(workout.max_weight)} кг × {workout.reps_at_max_weight}</strong><span>{workout.plan_name} · День {workout.day_number}</span></div><span className="workout-volume">{formatNumber(workout.total_volume)} кг</span></div>)}</div>
          {recentWorkouts.length > 4 && <button className="history-toggle" onClick={() => setHistoryExpanded(value => !value)}>{historyExpanded ? 'Свернуть историю' : `Показать всю историю (${recentWorkouts.length})`}</button>}
        </section>
      )}
    </div>
  );
};

const ExerciseImage: React.FC<{ exercise: Exercise }> = ({ exercise }) => (
  <span className="exercise-picker-media">
    {(exercise.image_url || exercise.video_url) && <img src={exercise.image_url || exercise.video_url} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />}
    <ImageIcon className="exercise-picker-placeholder" size={22} />
  </span>
);

function loadCanvasImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}
function wrapCanvasText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let lineNumber = 0;
  words.forEach(word => {
    const candidate = `${line}${word} `;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line.trim(), x, y + lineNumber * lineHeight);
      line = `${word} `;
      lineNumber += 1;
    } else line = candidate;
  });
  context.fillText(line.trim(), x, y + lineNumber * lineHeight);
}

