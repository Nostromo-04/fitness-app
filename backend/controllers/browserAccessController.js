const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { signSession, TOKEN_TTL_SECONDS } = require('../lib/sessionToken');
const { verifyBrowserAccessToken } = require('../lib/browserAccess');

const publicKey = fs.readFileSync(path.join(__dirname, '..', 'config', 'browser-access-public.pem'));
const usedNonces = new Set();
const BROWSER_TELEGRAM_ID = '-900000000000000001';
const USER_FIELDS = 'id, role, first_name, last_name, coach_id, telegram_id';

async function authenticateBrowser(req, res) {
  let client;
  try {
    const access = verifyBrowserAccessToken(req.body?.token, publicKey, usedNonces);
    client = await db.pool.connect();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [904202609]);
    let result;
    if (access.athleteFirstName && access.athleteLastName) {
      result = await client.query(
        `SELECT ${USER_FIELDS} FROM users
          WHERE role = 'athlete'
            AND LOWER(TRIM(first_name)) = LOWER(TRIM($1))
            AND LOWER(TRIM(last_name)) = LOWER(TRIM($2))`,
        [access.athleteFirstName, access.athleteLastName]
      );
      if (result.rows.length !== 1) throw new Error('Athlete browser profile was not found or is ambiguous');
      await client.query('COMMIT');
      const user = result.rows[0];
      const token = signSession(user, process.env.SESSION_SECRET);
      return res.json({ status: 'success', data: { user, profiles: [user], token, expiresIn: TOKEN_TTL_SECONDS } });
    }
    result = await client.query(
      `SELECT ${USER_FIELDS} FROM users WHERE telegram_id = $1 ORDER BY id LIMIT 1`,
      [BROWSER_TELEGRAM_ID]
    );
    if (result.rows[0]) {
      result = await client.query(
        `UPDATE users
            SET role = 'admin', coach_id = NULL, first_name = 'Codex', last_name = 'Browser'
          WHERE id = $1
          RETURNING ${USER_FIELDS}`,
        [result.rows[0].id]
      );
    } else {
      result = await client.query(
        `INSERT INTO users (telegram_id, role, first_name, last_name)
         VALUES ($1, 'admin', 'Codex', 'Browser')
         RETURNING ${USER_FIELDS}`,
        [BROWSER_TELEGRAM_ID]
      );
    }
    await client.query('COMMIT');
    const user = result.rows[0];
    const token = signSession(user, process.env.SESSION_SECRET);
    return res.json({ status: 'success', data: { user, profiles: [user], token, expiresIn: TOKEN_TTL_SECONDS } });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('Ошибка браузерной авторизации:', error.message);
    return res.status(401).json({ status: 'error', message: 'Ссылка доступа недействительна или устарела' });
  } finally {
    if (client) client.release();
  }
}

module.exports = { authenticateBrowser };

