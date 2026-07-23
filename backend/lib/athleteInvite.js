const crypto = require('crypto');

const USER_FIELDS = 'id, role, first_name, last_name, coach_id, telegram_id';

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function consumeInvite(client, rawToken, telegramId) {
  const result = await client.query(
    `SELECT i.id, i.athlete_id
     FROM athlete_invites i
     WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.expires_at > NOW()
     FOR UPDATE`,
    [tokenHash(rawToken)]
  );
  const invite = result.rows[0];
  if (!invite) return null;

  // Production-база была создана до появления users.updated_at, поэтому
  // привязка должна работать без необязательной колонки.
  const updated = await client.query(
    `UPDATE users SET telegram_id = $1
     WHERE id = $2 AND role = 'athlete' AND telegram_id IS NULL
     RETURNING ${USER_FIELDS}`,
    [String(telegramId), invite.athlete_id]
  );
  if (!updated.rows[0]) return null;

  await client.query('UPDATE athlete_invites SET used_at = NOW() WHERE id = $1', [invite.id]);
  return updated.rows[0];
}

module.exports = { consumeInvite, tokenHash };
