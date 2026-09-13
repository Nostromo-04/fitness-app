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
    verifyBrowserAccessToken(req.body?.token, publicKey, usedNonces);
    client = await db.pool.connect();
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [904202609]);
    let result = await client.query(
      `SELECT ${USER_FIELDS} FROM users WHERE telegram_id = $1 AND role = 'coach' ORDER BY id LIMIT 1`,
      [BROWSER_TELEGRAM_ID]
    );
    if (!result.rows[0]) {
      result = await client.query(
        `INSERT INTO users (telegram_id, role, first_name, last_name)
         VALUES ($1, 'coach', 'Codex', 'Browser')
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
