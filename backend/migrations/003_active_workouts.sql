-- Одна активная тренировка на спортсмена. Старые незавершённые сессии
-- не удаляются и поэтому не мешают безопасному развёртыванию миграции.
CREATE TABLE IF NOT EXISTS active_workouts (
  athlete_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  session_id INTEGER UNIQUE NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  started_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_by_role VARCHAR(20) NOT NULL CHECK (started_by_role IN ('coach', 'athlete')),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_active_workouts_starter
  ON active_workouts(started_by_user_id);
