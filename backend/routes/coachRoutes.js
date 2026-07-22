const express = require('express');
const router = express.Router();
const coachController = require('../controllers/coachController');
const { requireRole } = require('../middleware/auth');

// POST /api/coaches — администратор создаёт нового тренера
router.post('/', requireRole('admin'), coachController.createCoach);

module.exports = router;
