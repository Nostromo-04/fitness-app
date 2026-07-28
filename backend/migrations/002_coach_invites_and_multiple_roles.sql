-- Один Telegram-пользователь может иметь отдельные профили тренера и спортсмена.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_telegram_id_key;
CREATE INDEX IF NOT EXISTS idx_users_telegram_role ON users(telegram_id, role);

-- Одноразовые приглашения тренеров. В БД хранится только SHA-256 хэш токена.
CREATE TABLE IF NOT EXISTS coach_invites (
  id SERIAL PRIMARY KEY,
  token_hash CHAR(64) UNIQUE NOT NULL,
  coach_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by_admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coach_invites_hash ON coach_invites(token_hash);
