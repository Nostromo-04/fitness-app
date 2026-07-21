const express = require('express');
const router = express.Router();
const coachController = require('../controllers/coachController');

// POST /api/coaches — администратор создаёт нового тренера
router.post('/', coachController.createCoach);

module.exports = router;
