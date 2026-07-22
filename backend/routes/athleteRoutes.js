const express = require('express');
const router = express.Router();
const athleteController = require('../controllers/athleteController');
const { requireRole } = require('../middleware/auth');

// POST /api/athletes — тренер создаёт нового спортсмена
router.post('/', requireRole('coach'), athleteController.createAthlete);

module.exports = router;
