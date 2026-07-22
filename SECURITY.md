# Security

## Required production secrets

Configure these variables in Railway. Never commit their values:

- `TELEGRAM_BOT_TOKEN` — token issued by BotFather.
- `SESSION_SECRET` — a separate random value of at least 32 bytes.
- `DATABASE_URL` — Railway PostgreSQL connection string.
- `FRONTEND_URL` and `ALLOWED_ORIGINS` — the deployed frontend URL.

Generate `SESSION_SECRET` locally with:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

## Authentication flow

1. The frontend sends Telegram WebApp `initData` to `POST /api/auth/telegram`.
2. The backend validates Telegram's HMAC signature and a 15-minute `auth_date` window.
3. The backend returns a signed, 12-hour application session.
4. Protected API calls send that session in `Authorization: Bearer ...`.
5. The backend reloads the user and checks ownership of athletes, plans and workout data.

Athlete invitations use a random 256-bit, single-use token. Only its SHA-256 hash is stored in PostgreSQL and it expires after 72 hours.

## Before merging this change

The public Git history previously contained backend environment files. Removing them in a new commit does not remove old versions from history. Rotate the PostgreSQL password/connection string before deploying this branch. Consider rewriting repository history afterward if this repository must remain public.

Run the migration if the deployment account cannot create tables automatically:

```text
backend/migrations/001_secure_athlete_invites.sql
```

## Reporting a vulnerability

Do not open a public issue containing credentials or personal data. Contact the repository owner privately and rotate any exposed secret immediately.
