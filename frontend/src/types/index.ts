export interface User {
    id: number;
    telegram_id: string;
    role: 'coach' | 'athlete';
    coach_id?: number;
    first_name: string;
    last_name?: string;
    phone?: string;
    created_at: string;
  }
  
  export interface Exercise {
    id: number;
    name: string;
    muscle_group: string;
    image_url?: string;
    video_url?: string;
    created_by_coach_id: number;
    created_at: string;
  }
  
  export interface WorkoutPlan {
    id: number;
    name: string;
    coach_id: number;
    created_at: string;
    days_count?: string;
    athletes_count?: string;
  }
  
  export interface WorkoutDay {
    id: number;
    plan_id: number;
    day_number: number;
    exercises: DayExercise[];
  }
  
  export interface DayExercise {
    id: number;
    day_id: number;
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
  
  export interface Set {
    id: number;
    session_id: number;
    exercise_id: number;
    set_number: number;
    reps_done: number;
    weight_done: number;
    is_completed: boolean;
    created_at: string;
  }
  
  export interface WorkoutSession {
    id: number;
    athlete_id: number;
    plan_id: number;
    day_id: number;
    workout_date: string;
    feedback_emoji?: '👍' | '👎';
    completed_at?: string;
    created_at: string;
  }