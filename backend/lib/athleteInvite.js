const crypto = require('crypto');

const USER_FIELDS = 'id, role, first_name, last_name, coach_id, telegram_id';

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function consumeInvite(client, rawToken, telegramId) {
  let result = await client.query(
    `SELECT i.id, i.athlete_id
     FROM athlete_invites i
     WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.expires_at > NOW()
     FOR UPDATE`,
    [tokenHash(rawToken)]
  );
  let invite = result.rows[0];
  let targetId = invite?.athlete_id;
  let targetRole = 'athlete';
  let inviteTable = 'athlete_invites';

  if (!invite) {
    result = await client.query(
      `SELECT i.id, i.coach_id
       FROM coach_invites i
       WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.expires_at > NOW()
       FOR UPDATE`,
      [tokenHash(rawToken)]
    );
    invite = result.rows[0];
    targetId = invite?.coach_id;
    targetRole = 'coach';
    inviteTable = 'coach_invites';
  }

  if (!invite) return null;

  // Production-база была создана до появления users.updated_at, поэтому
  // привязка должна работать без необязательной колонки.
  const updated = await client.query(
    `UPDATE users SET telegram_id = $1
     WHERE id = $2 AND role = $3 AND telegram_id IS NULL
     RETURNING ${USER_FIELDS}`,
    [String(telegramId), targetId, targetRole]
  );
  if (!updated.rows[0]) return null;

  await client.query(`UPDATE ${inviteTable} SET used_at = NOW() WHERE id = $1`, [invite.id]);
  return updated.rows[0];
}

module.exports = { consumeInvite, tokenHash };
