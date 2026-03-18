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

export interface CreatePlanData {
  name: string;
  coach_id: number;
}

export interface CreateDayData {
  day_number: number;
}

export interface AddExerciseData {
  exercise_id: number;
  sets_count: number;
  default_reps: number;
  default_weight: number;
  order_index: number;
}