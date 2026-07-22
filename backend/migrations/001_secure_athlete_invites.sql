CREATE TABLE IF NOT EXISTS athlete_invites (
  id SERIAL PRIMARY KEY,
  token_hash CHAR(64) UNIQUE NOT NULL,
  coach_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  athlete_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_athlete_invites_hash ON athlete_invites(token_hash);
