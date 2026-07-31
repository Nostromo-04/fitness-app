const db = require('../config/database');
const { verifySession } = require('../lib/sessionToken');

async function authenticate(req, res, next) {
  try {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ status: 'error', message: 'Требуется авторизация' });

    const session = verifySession(match[1], process.env.SESSION_SECRET);
    const result = await db.query(
      'SELECT id, role, coach_id, telegram_id, first_name, last_name FROM users WHERE id = $1 AND telegram_id = $2',
      [session.sub, session.telegramId]
    );
    if (!result.rows[0]) return res.status(401).json({ status: 'error', message: 'Сессия недействительна' });

    req.user = result.rows[0];
    next();
  } catch {
    return res.status(401).json({ status: 'error', message: 'Сессия истекла или недействительна' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || (!roles.includes(req.user.role) && req.user.role !== 'admin')) {
      return res.status(403).json({ status: 'error', message: 'Недостаточно прав' });
    }
    next();
  };
}

function requireCoachParam(param = 'coachId') {
  return (req, res, next) => {
    if (req.user.role !== 'admin' && Number(req.params[param]) !== Number(req.user.id)) {
      return res.status(403).json({ status: 'error', message: 'Нет доступа к данным другого тренера' });
    }
    next();
  };
}

function requireAthleteAccess(param = 'athleteId') {
  return async (req, res, next) => {
    const athleteId = Number(req.params[param] ?? req.body.athlete_id);
    if (!Number.isInteger(athleteId)) return res.status(400).json({ status: 'error', message: 'Некорректный спортсмен' });
    if (req.user.role === 'admin' || (req.user.role === 'athlete' && athleteId === Number(req.user.id))) return next();
    if (req.user.role === 'coach') {
      const owned = await db.query('SELECT 1 FROM users WHERE id = $1 AND coach_id = $2 AND role = \'athlete\'', [athleteId, req.user.id]);
      if (owned.rows[0]) return next();
    }
    return res.status(403).json({ status: 'error', message: 'Нет доступа к этому спортсмену' });
  };
}

function requirePlanAccess({ write = false } = {}) {
  return async (req, res, next) => {
    const planId = Number(req.params.planId);
    const result = await db.query(
      `SELECT wp.coach_id,
              EXISTS (
                SELECT 1 FROM plan_assignments pa
                 WHERE pa.plan_id = wp.id AND pa.athlete_id = $2
              ) AS assigned
       FROM workout_plans wp WHERE wp.id = $1`,
      [planId, req.user.id]
    );
    const plan = result.rows[0];
    const allowed = req.user.role === 'admin'
      || (req.user.role === 'coach' && Number(plan?.coach_id) === Number(req.user.id))
      || (!write && req.user.role === 'athlete' && plan?.assigned);
    if (!allowed) return res.status(403).json({ status: 'error', message: 'Нет доступа к этому плану' });
    next();
  };
}

function requireSessionAccess(param = 'sessionId') {
  return async (req, res, next) => {
    const result = await db.query(
      `SELECT ws.athlete_id, u.coach_id FROM workout_sessions ws
       JOIN users u ON u.id = ws.athlete_id WHERE ws.id = $1`,
      [Number(req.params[param])]
    );
    const row = result.rows[0];
    const allowed = req.user.role === 'admin'
      || (req.user.role === 'athlete' && Number(row?.athlete_id) === Number(req.user.id))
      || (req.user.role === 'coach' && Number(row?.coach_id) === Number(req.user.id));
    if (!allowed) return res.status(403).json({ status: 'error', message: 'Нет доступа к этой тренировке' });
    next();
  };
}

function requireActiveWorkoutOwner(param = 'sessionId') {
  return async (req, res, next) => {
    const result = await db.query(
      `SELECT started_by_user_id, started_by_role
         FROM active_workouts
        WHERE session_id = $1`,
      [Number(req.params[param])]
    );
    const active = result.rows[0];
    if (!active) {
      return res.status(409).json({ status: 'error', message: 'Тренировка уже завершена или отменена' });
    }
    if (Number(active.started_by_user_id) !== Number(req.user.id)) {
      const starter = active.started_by_role === 'athlete' ? 'спортсмен' : 'тренер';
      return res.status(409).json({
        status: 'error',
        message: `Подходы записывает ${starter}, начавший тренировку`,
      });
    }
    next();
  };
}

function requireActiveSetOwner(param = 'setId') {
  return async (req, res, next) => {
    const result = await db.query(
      `SELECT aw.started_by_user_id, aw.started_by_role
         FROM set_logs sl
         JOIN active_workouts aw ON aw.session_id = sl.session_id
        WHERE sl.id = $1`,
      [Number(req.params[param])]
    );
    const active = result.rows[0];
    if (!active) {
      return res.status(409).json({ status: 'error', message: 'Активный подход не найден' });
    }
    if (Number(active.started_by_user_id) !== Number(req.user.id)) {
      return res.status(409).json({ status: 'error', message: 'Эту тренировку проводит другой пользователь' });
    }
    next();
  };
}

function requireOwnedResource(kind, param) {
  const queries = {
    day: `SELECT wp.coach_id,
                 EXISTS (SELECT 1 FROM plan_assignments pa WHERE pa.plan_id = wp.id AND pa.athlete_id = $2) AS assigned
            FROM workout_days wd JOIN workout_plans wp ON wp.id = wd.plan_id WHERE wd.id = $1`,
    dayExercise: `SELECT wp.coach_id,
                         EXISTS (SELECT 1 FROM plan_assignments pa WHERE pa.plan_id = wp.id AND pa.athlete_id = $2) AS assigned
                    FROM day_exercises de
                    JOIN workout_days wd ON wd.id = de.day_id
                    JOIN workout_plans wp ON wp.id = wd.plan_id
                   WHERE de.id = $1`,
    set: `SELECT u.coach_id, ws.athlete_id, (ws.athlete_id = $2) AS assigned
            FROM set_logs sl JOIN workout_sessions ws ON ws.id = sl.session_id
            JOIN users u ON u.id = ws.athlete_id WHERE sl.id = $1`,
  };
  return async (req, res, next) => {
    const row = (await db.query(
      queries[kind],
      [Number(req.params[param]), Number(req.user.id)]
    )).rows[0];
    const allowed = req.user.role === 'admin'
      || (req.user.role === 'coach' && Number(row?.coach_id) === Number(req.user.id))
      || ((kind === 'day' || kind === 'dayExercise') && req.user.role === 'athlete' && row?.assigned)
      || (kind === 'set' && req.user.role === 'athlete' && Number(row?.athlete_id) === Number(req.user.id));
    if (!allowed) return res.status(403).json({ status: 'error', message: 'Нет доступа к этому ресурсу' });
    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  requireCoachParam,
  requireAthleteAccess,
  requirePlanAccess,
  requireSessionAccess,
  requireActiveWorkoutOwner,
  requireActiveSetOwner,
  requireOwnedResource,
};
